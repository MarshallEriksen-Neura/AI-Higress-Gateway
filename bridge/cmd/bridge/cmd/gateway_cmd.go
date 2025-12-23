package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"bridge/internal/logging"
	"bridge/internal/protocol"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/spf13/cobra"
	"nhooyr.io/websocket"
)

func NewGatewayCmd() *cobra.Command {
	gatewayCmd := &cobra.Command{
		Use:   "gateway",
		Short: "Tunnel gateway (runs in cloud)",
	}
	gatewayCmd.AddCommand(newGatewayServeCmd())
	return gatewayCmd
}

func newGatewayServeCmd() *cobra.Command {
	var listen string
	var tunnelPath string
	var internalToken string
	var agentTokenSecret string
	var gatewayID string
	var redisURL string
	var redisKeyPrefix string
	var redisTTLSeconds int
	var redisResultKeyPrefix string
	var redisResultTTLSeconds int

	c := &cobra.Command{
		Use:   "serve",
		Short: "Start tunnel gateway (single-instance MVP)",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, stop := signal.NotifyContext(cmd.Context(), os.Interrupt, syscall.SIGTERM)
			defer stop()

			server := newGatewayServer(gatewayOptions{
				ListenAddr:           listen,
				TunnelPath:           tunnelPath,
				InternalToken:        internalToken,
				AgentTokenSecret:     agentTokenSecret,
				GatewayID:            gatewayID,
				RedisURL:             redisURL,
				RedisKeyPrefix:       redisKeyPrefix,
				RedisTTL:             time.Duration(redisTTLSeconds) * time.Second,
				RedisResultKeyPrefix: redisResultKeyPrefix,
				RedisResultTTL:       time.Duration(redisResultTTLSeconds) * time.Second,
			})
			return server.run(ctx)
		},
	}
	c.Flags().StringVar(&listen, "listen", ":8088", "listen address")
	c.Flags().StringVar(&tunnelPath, "tunnel-path", "/bridge/tunnel", "websocket tunnel path")
	c.Flags().StringVar(&internalToken, "internal-token", "", "shared token for internal HTTP APIs (optional)")
	c.Flags().StringVar(&agentTokenSecret, "agent-token-secret", "", "shared secret to verify agent AUTH token (optional; if set, token is required)")
	c.Flags().StringVar(&gatewayID, "gateway-id", "", "gateway instance id (default: auto)")
	c.Flags().StringVar(&redisURL, "redis-url", "", "redis connection URL for HA routing (optional)")
	c.Flags().StringVar(&redisKeyPrefix, "redis-key-prefix", "agent_online:", "redis key prefix for registry")
	c.Flags().IntVar(&redisTTLSeconds, "redis-ttl-seconds", 30, "redis registry TTL seconds")
	c.Flags().StringVar(&redisResultKeyPrefix, "redis-result-key-prefix", "bridge:result:", "redis key prefix for persisted results (optional)")
	c.Flags().IntVar(&redisResultTTLSeconds, "redis-result-ttl-seconds", 86400, "redis TTL seconds for persisted results (optional)")
	return c
}

type gatewayOptions struct {
	ListenAddr       string
	TunnelPath       string
	InternalToken    string
	AgentTokenSecret string
	GatewayID        string
	RedisURL         string
	RedisKeyPrefix   string
	RedisTTL         time.Duration

	RedisResultKeyPrefix string
	RedisResultTTL       time.Duration
}

type gatewayServer struct {
	opts gatewayOptions

	mu     sync.RWMutex
	agents map[string]*agentConn

	subsMu sync.Mutex
	subs   map[string]chan []byte

	redis *redis.Client
}

type agentInfo struct {
	AgentID     string `json:"agent_id"`
	Status      string `json:"status"`
	LastSeenAt  int64  `json:"last_seen_at"`
	ConnectedAt int64  `json:"connected_at"`
}

type agentConn struct {
	agentID       string
	connSessionID string
	userID        string
	connectedAt   time.Time
	lastSeenAt    time.Time
	conn          *websocket.Conn

	writeMu sync.Mutex
	tools   []protocol.ToolDescriptor
}

func newGatewayServer(opts gatewayOptions) *gatewayServer {
	if opts.ListenAddr == "" {
		opts.ListenAddr = ":8088"
	}
	if opts.TunnelPath == "" {
		opts.TunnelPath = "/bridge/tunnel"
	}
	if opts.GatewayID == "" {
		opts.GatewayID = defaultGatewayID()
	}
	if opts.RedisTTL <= 0 {
		opts.RedisTTL = 30 * time.Second
	}
	if opts.RedisKeyPrefix == "" {
		opts.RedisKeyPrefix = "agent_online:"
	}
	if opts.RedisResultKeyPrefix == "" {
		opts.RedisResultKeyPrefix = "bridge:result:"
	}
	if opts.RedisResultTTL <= 0 {
		opts.RedisResultTTL = 24 * time.Hour
	}
	return &gatewayServer{
		opts:   opts,
		agents: make(map[string]*agentConn),
		subs:   make(map[string]chan []byte),
	}
}

func (s *gatewayServer) run(ctx context.Context) error {
	logger := logging.FromContext(ctx)

	if strings.TrimSpace(s.opts.RedisURL) != "" {
		client, err := newRedisClient(s.opts.RedisURL)
		if err != nil {
			return err
		}
		s.redis = client
		logger.Info("redis enabled for registry", "gateway_id", s.opts.GatewayID, "ttl_seconds", int(s.opts.RedisTTL.Seconds()))
		go s.consumeCommandStream(ctx)
	}

	mux := http.NewServeMux()
	mux.HandleFunc(s.opts.TunnelPath, s.handleTunnelWS)
	mux.HandleFunc("/internal/bridge/agents", s.handleListAgents)
	mux.HandleFunc("/internal/bridge/agents/", s.handleAgentSubresource)
	mux.HandleFunc("/internal/bridge/invoke", s.handleInvoke)
	mux.HandleFunc("/internal/bridge/cancel", s.handleCancel)
	mux.HandleFunc("/internal/bridge/events", s.handleEventsSSE)
	mux.HandleFunc("/internal/bridge/results/", s.handleResultGet)

	httpServer := &http.Server{
		Addr:              s.opts.ListenAddr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdownCtx)
	}()

	logger.Info("tunnel gateway listening", "addr", s.opts.ListenAddr, "tunnel_path", s.opts.TunnelPath)
	err := httpServer.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *gatewayServer) handleTunnelWS(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logger := logging.FromContext(ctx)

	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	// Allow larger frames (tool list/result chunks) than the nhooyr default 32KiB.
	conn.SetReadLimit(512 * 1024)
	defer conn.Close(websocket.StatusNormalClosure, "")

	tmpSessionID := "ws_" + uuid.NewString()
	logger.Info("agent connected", "remote", r.RemoteAddr, "conn_session_id", tmpSessionID)

	var registered *agentConn
	var pendingHello *agentConn
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			agentID := ""
			if registered != nil {
				agentID = registered.agentID
			} else if pendingHello != nil {
				agentID = pendingHello.agentID
			}
			logger.Info(
				"agent connection closed",
				"agent_id", agentID,
				"remote", r.RemoteAddr,
				"err", err.Error(),
				"close_status", websocket.CloseStatus(err),
			)
			break
		}
		env, err := protocol.DecodeEnvelope(data)
		if err != nil {
			logger.Warn("invalid envelope", "err", err.Error())
			continue
		}

		if env.AgentID == "" && registered != nil {
			env.AgentID = registered.agentID
		}

		switch env.Type {
		case protocol.TypeHello:
			if env.AgentID == "" {
				logger.Warn("hello missing agent_id")
				continue
			}
			pendingHello = &agentConn{
				agentID:       env.AgentID,
				connSessionID: firstNonEmpty(env.ConnSessionID, tmpSessionID),
				connectedAt:   time.Now(),
				lastSeenAt:    time.Now(),
				conn:          conn,
			}
			if strings.TrimSpace(s.opts.AgentTokenSecret) == "" {
				registered = pendingHello
				pendingHello = nil
				s.mu.Lock()
				s.agents[env.AgentID] = registered
				s.mu.Unlock()
				s.upsertRegistry(ctx, env.AgentID, registered.connSessionID)
				logger.Info("agent registered", "agent_id", env.AgentID, "conn_session_id", registered.connSessionID)
			} else {
				logger.Info("agent hello received (awaiting auth)", "agent_id", env.AgentID)
			}
		case protocol.TypeAuth:
			if strings.TrimSpace(s.opts.AgentTokenSecret) == "" {
				continue
			}
			if pendingHello == nil {
				_ = conn.Close(websocket.StatusPolicyViolation, "missing hello")
				return
			}
			if registered != nil {
				continue
			}
			var payload protocol.AuthPayload
			if err := json.Unmarshal(env.Payload, &payload); err != nil {
				_ = conn.Close(websocket.StatusPolicyViolation, "invalid auth payload")
				return
			}
			userID, err := verifyAgentToken(s.opts.AgentTokenSecret, payload.Token, pendingHello.agentID)
			if err != nil {
				logger.Warn("agent auth failed", "agent_id", pendingHello.agentID, "err", err.Error())
				_ = conn.Close(websocket.StatusPolicyViolation, "invalid token")
				return
			}
			pendingHello.userID = userID
			registered = pendingHello
			pendingHello = nil
			s.mu.Lock()
			s.agents[registered.agentID] = registered
			s.mu.Unlock()
			s.upsertRegistry(ctx, registered.agentID, registered.connSessionID)
			logger.Info("agent authenticated", "agent_id", registered.agentID, "user_id", registered.userID)
		case protocol.TypePing:
			_ = s.sendToConn(ctx, conn, protocol.Envelope{
				V:       1,
				Type:    protocol.TypePong,
				AgentID: env.AgentID,
				Ts:      time.Now().Unix(),
			})
			if registered != nil {
				s.upsertRegistry(ctx, registered.agentID, registered.connSessionID)
			}
		case protocol.TypeTools:
			if registered == nil {
				continue
			}
			var payload protocol.ToolsPayload
			if err := json.Unmarshal(env.Payload, &payload); err != nil {
				continue
			}
			s.mu.Lock()
			registered.tools = payload.Tools
			registered.lastSeenAt = time.Now()
			s.mu.Unlock()
			s.upsertRegistry(ctx, registered.agentID, registered.connSessionID)
			s.publishEvent(env)
		case protocol.TypeChunk, protocol.TypeResult, protocol.TypeInvokeAck, protocol.TypeCancelAck:
			if registered != nil {
				s.mu.Lock()
				registered.lastSeenAt = time.Now()
				s.mu.Unlock()
				s.upsertRegistry(ctx, registered.agentID, registered.connSessionID)
			}
			if env.Type == protocol.TypeResult {
				// If Redis is enabled, persist the RESULT before ACK to keep "strong final state" semantics.
				if err := s.persistResult(ctx, env); err != nil {
					logger.Warn("persist result failed (skip ack)", "req_id", env.ReqID, "err", err.Error())
				} else {
					_ = s.sendToConn(ctx, conn, protocol.Envelope{
						V:       1,
						Type:    protocol.TypeResultAck,
						AgentID: env.AgentID,
						ReqID:   env.ReqID,
						Ts:      time.Now().Unix(),
						Payload: []byte("{}"),
					})
				}
			}
			s.publishEvent(env)
		default:
			s.publishEvent(env)
		}
	}

	if registered != nil {
		s.mu.Lock()
		current := s.agents[registered.agentID]
		if current != nil && current.conn == conn {
			delete(s.agents, registered.agentID)
		}
		s.mu.Unlock()
		s.deleteRegistryIfOwned(context.Background(), registered.agentID, registered.connSessionID)
		s.publishEvent(&protocol.Envelope{
			V:       1,
			Type:    "DISCONNECT",
			AgentID: registered.agentID,
			Ts:      time.Now().Unix(),
		})
	}
}

type bridgeAgentClaims struct {
	Type    string `json:"type"`
	AgentID string `json:"agent_id"`
	jwt.RegisteredClaims
}

func verifyAgentToken(secret string, tokenString string, agentID string) (string, error) {
	secret = strings.TrimSpace(secret)
	tokenString = strings.TrimSpace(tokenString)
	if secret == "" {
		return "", errors.New("missing secret")
	}
	if tokenString == "" {
		return "", errors.New("missing token")
	}
	if strings.TrimSpace(agentID) == "" {
		return "", errors.New("missing agent_id")
	}

	claims := &bridgeAgentClaims{}
	parser := jwt.NewParser(jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	parsed, err := parser.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %s", t.Method.Alg())
		}
		return []byte(secret), nil
	})
	if err != nil || parsed == nil || !parsed.Valid {
		return "", fmt.Errorf("invalid token: %w", err)
	}
	if claims.Type != "bridge_agent" {
		return "", fmt.Errorf("invalid token type: %s", claims.Type)
	}
	if claims.AgentID != agentID {
		return "", fmt.Errorf("agent_id mismatch")
	}
	if claims.ExpiresAt != nil && time.Now().After(claims.ExpiresAt.Time) {
		return "", fmt.Errorf("token expired")
	}
	userID := strings.TrimSpace(claims.Subject)
	if userID == "" {
		return "", fmt.Errorf("missing sub")
	}
	return userID, nil
}

func (s *gatewayServer) handleListAgents(w http.ResponseWriter, r *http.Request) {
	if !s.checkInternalAuth(w, r) {
		return
	}

	resp := struct {
		Agents []agentInfo `json:"agents"`
	}{}

	agents := s.collectAgents(r.Context())
	resp.Agents = agents

	writeJSON(w, http.StatusOK, resp)
}

// collectAgents aggregates in-memory online agents and, if Redis is enabled,
// supplements with registry entries from Redis for multi-instance awareness.
func (s *gatewayServer) collectAgents(ctx context.Context) []agentInfo {
	out := make(map[string]agentInfo)

	// Prefer in-memory (definitive for this instance).
	s.mu.RLock()
	for _, a := range s.agents {
		out[a.agentID] = agentInfo{
			AgentID:     a.agentID,
			Status:      "online",
			LastSeenAt:  a.lastSeenAt.Unix(),
			ConnectedAt: a.connectedAt.Unix(),
		}
	}
	s.mu.RUnlock()

	// Supplement with Redis registry (other gateway instances).
	if s.redis != nil {
		prefix := s.opts.RedisKeyPrefix
		if strings.TrimSpace(prefix) == "" {
			prefix = "agent_online:"
		}
		iter := s.redis.Scan(ctx, 0, prefix+"*", 100).Iterator()
		for iter.Next(ctx) {
			key := iter.Val()
			raw, err := s.redis.Get(ctx, key).Bytes()
			if err != nil {
				continue
			}
			var rv registryValue
			if err := json.Unmarshal(raw, &rv); err != nil {
				continue
			}
			agentID := strings.TrimPrefix(key, prefix)
			if _, exists := out[agentID]; exists {
				continue
			}
			out[agentID] = agentInfo{
				AgentID:     agentID,
				Status:      "cached", // seen via Redis, not necessarily connected to this instance
				LastSeenAt:  rv.UpdatedAt,
				ConnectedAt: rv.UpdatedAt,
			}
		}
	}

	result := make([]agentInfo, 0, len(out))
	for _, v := range out {
		result = append(result, v)
	}
	return result
}

func (s *gatewayServer) handleAgentSubresource(w http.ResponseWriter, r *http.Request) {
	if !s.checkInternalAuth(w, r) {
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/internal/bridge/agents/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 1 || parts[0] == "" {
		http.NotFound(w, r)
		return
	}
	agentID := parts[0]
	if len(parts) == 2 && parts[1] == "tools" && r.Method == http.MethodGet {
		s.handleAgentTools(w, r, agentID)
		return
	}
	http.NotFound(w, r)
}

func (s *gatewayServer) handleAgentTools(w http.ResponseWriter, r *http.Request, agentID string) {
	s.mu.RLock()
	a := s.agents[agentID]
	s.mu.RUnlock()
	if a == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "agent_offline"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"agent_id": agentID,
		"tools":    a.tools,
	})
}

type invokeRequest struct {
	ReqID     string         `json:"req_id"`
	AgentID   string         `json:"agent_id"`
	ToolName  string         `json:"tool_name"`
	Arguments map[string]any `json:"arguments"`
	TimeoutMs int            `json:"timeout_ms"`
	Stream    bool           `json:"stream"`
}

func (s *gatewayServer) handleInvoke(w http.ResponseWriter, r *http.Request) {
	if !s.checkInternalAuth(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req invokeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if req.ReqID == "" || req.AgentID == "" || req.ToolName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing_fields"})
		return
	}

	a := s.getAgent(req.AgentID)
	if a == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "agent_offline"})
		return
	}

	payload := protocol.InvokePayload{
		Tool: protocol.ToolCall{
			Name: req.ToolName,
			Args: req.Arguments,
		},
		TimeoutMs: req.TimeoutMs,
		Stream:    protocol.StreamOptions{Enabled: req.Stream},
	}
	env := protocol.Envelope{
		V:       1,
		Type:    protocol.TypeInvoke,
		AgentID: req.AgentID,
		ReqID:   req.ReqID,
		Ts:      time.Now().Unix(),
		Payload: mustMarshalJSON(payload),
	}
	if err := s.sendToAgent(r.Context(), a, env); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "send_failed"})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"req_id": req.ReqID, "status": "accepted"})
}

type cancelRequest struct {
	ReqID   string `json:"req_id"`
	AgentID string `json:"agent_id"`
	Reason  string `json:"reason"`
}

func (s *gatewayServer) handleCancel(w http.ResponseWriter, r *http.Request) {
	if !s.checkInternalAuth(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req cancelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if req.ReqID == "" || req.AgentID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing_fields"})
		return
	}
	a := s.getAgent(req.AgentID)
	if a == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "agent_offline"})
		return
	}

	env := protocol.Envelope{
		V:       1,
		Type:    protocol.TypeCancel,
		AgentID: req.AgentID,
		ReqID:   req.ReqID,
		Ts:      time.Now().Unix(),
		Payload: mustMarshalJSON(protocol.CancelPayload{Reason: req.Reason}),
	}
	if err := s.sendToAgent(r.Context(), a, env); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "send_failed"})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"req_id": req.ReqID, "status": "sent"})
}

func (s *gatewayServer) handleEventsSSE(w http.ResponseWriter, r *http.Request) {
	if !s.checkInternalAuth(w, r) {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	subID := uuid.NewString()
	ch := make(chan []byte, 128)

	s.subsMu.Lock()
	s.subs[subID] = ch
	s.subsMu.Unlock()

	defer func() {
		s.subsMu.Lock()
		delete(s.subs, subID)
		s.subsMu.Unlock()
	}()

	io.WriteString(w, "event: ready\ndata: {}\n\n")
	flusher.Flush()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-ch:
			io.WriteString(w, "event: bridge\n")
			io.WriteString(w, "data: ")
			w.Write(msg)
			io.WriteString(w, "\n\n")
			flusher.Flush()
		}
	}
}

func (s *gatewayServer) publishEvent(env *protocol.Envelope) {
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	s.subsMu.Lock()
	for _, ch := range s.subs {
		select {
		case ch <- b:
		default:
		}
	}
	s.subsMu.Unlock()

	s.publishRedisEvent(env, b)
}

func (s *gatewayServer) getAgent(agentID string) *agentConn {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.agents[agentID]
}

func (s *gatewayServer) sendToAgent(ctx context.Context, a *agentConn, env protocol.Envelope) error {
	a.writeMu.Lock()
	defer a.writeMu.Unlock()
	data, err := protocol.EncodeEnvelope(env)
	if err != nil {
		return err
	}
	return a.conn.Write(ctx, websocket.MessageText, data)
}

func (s *gatewayServer) sendToConn(ctx context.Context, conn *websocket.Conn, env protocol.Envelope) error {
	data, err := protocol.EncodeEnvelope(env)
	if err != nil {
		return err
	}
	return conn.Write(ctx, websocket.MessageText, data)
}

func (s *gatewayServer) checkInternalAuth(w http.ResponseWriter, r *http.Request) bool {
	if s.opts.InternalToken == "" {
		return true
	}
	if r.Header.Get("X-Internal-Token") != s.opts.InternalToken {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

type registryValue struct {
	GatewayID     string `json:"gateway_id"`
	ConnSessionID string `json:"conn_session_id"`
	UpdatedAt     int64  `json:"updated_at"`
}

func (s *gatewayServer) registryKey(agentID string) string {
	return s.opts.RedisKeyPrefix + agentID
}

func (s *gatewayServer) upsertRegistry(ctx context.Context, agentID string, connSessionID string) {
	if s.redis == nil || agentID == "" {
		return
	}
	val := registryValue{
		GatewayID:     s.opts.GatewayID,
		ConnSessionID: connSessionID,
		UpdatedAt:     time.Now().Unix(),
	}
	b, err := json.Marshal(val)
	if err != nil {
		return
	}
	_ = s.redis.Set(ctx, s.registryKey(agentID), b, s.opts.RedisTTL).Err()
}

func (s *gatewayServer) deleteRegistryIfOwned(ctx context.Context, agentID string, connSessionID string) {
	if s.redis == nil || agentID == "" {
		return
	}
	key := s.registryKey(agentID)
	raw, err := s.redis.Get(ctx, key).Bytes()
	if err != nil {
		return
	}
	var current registryValue
	if err := json.Unmarshal(raw, &current); err != nil {
		return
	}
	if current.GatewayID != s.opts.GatewayID {
		return
	}
	if connSessionID != "" && current.ConnSessionID != connSessionID {
		return
	}
	_ = s.redis.Del(ctx, key).Err()
}

func (s *gatewayServer) publishRedisEvent(env *protocol.Envelope, rawJSON []byte) {
	if s.redis == nil || env == nil {
		return
	}
	if rawJSON == nil {
		b, err := json.Marshal(env)
		if err != nil {
			return
		}
		rawJSON = b
	}
	// MVP: publish to a broad channel and a per-agent channel.
	_ = s.redis.Publish(context.Background(), "bridge:evt", rawJSON).Err()
	if env.AgentID != "" {
		_ = s.redis.Publish(context.Background(), "bridge:evt:agent:"+env.AgentID, rawJSON).Err()
	}
}

func (s *gatewayServer) resultKey(reqID string) string {
	return s.opts.RedisResultKeyPrefix + reqID
}

func (s *gatewayServer) persistResult(ctx context.Context, env *protocol.Envelope) error {
	if env == nil || env.ReqID == "" {
		return nil
	}
	if s.redis == nil {
		// Single-instance mode: no persistence, ACK immediately.
		return nil
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, s.resultKey(env.ReqID), raw, s.opts.RedisResultTTL).Err()
}

func (s *gatewayServer) handleResultGet(w http.ResponseWriter, r *http.Request) {
	if !s.checkInternalAuth(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	reqID := strings.TrimPrefix(r.URL.Path, "/internal/bridge/results/")
	reqID = strings.Trim(reqID, "/")
	if reqID == "" {
		http.NotFound(w, r)
		return
	}
	if s.redis == nil {
		writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "redis_not_enabled"})
		return
	}

	raw, err := s.redis.Get(r.Context(), s.resultKey(reqID)).Bytes()
	if err != nil {
		if err == redis.Nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
			return
		}
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "redis_error"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

func newRedisClient(redisURL string) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	return redis.NewClient(opt), nil
}

func defaultGatewayID() string {
	h, _ := os.Hostname()
	if h == "" {
		h = "gateway"
	}
	return h + "-" + uuid.NewString()
}

func (s *gatewayServer) consumeCommandStream(ctx context.Context) {
	logger := logging.FromContext(ctx)
	if s.redis == nil {
		return
	}
	stream := "bridge:cmd:" + s.opts.GatewayID
	group := "gateway"
	consumer := s.opts.GatewayID

	if err := s.redis.XGroupCreateMkStream(ctx, stream, group, "$").Err(); err != nil {
		// BUSYGROUP is ok if group already exists.
		if !strings.Contains(strings.ToLower(err.Error()), "busygroup") {
			logger.Warn("create redis consumer group failed", "stream", stream, "err", err.Error())
		}
	}

	logger.Info("redis stream consumer started", "stream", stream, "group", group, "consumer", consumer)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		streams, err := s.redis.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    group,
			Consumer: consumer,
			Streams:  []string{stream, ">"},
			Count:    16,
			Block:    1 * time.Second,
		}).Result()
		if err != nil {
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				continue
			}
			if err == redis.Nil {
				continue
			}
			logger.Warn("redis xreadgroup failed", "err", err.Error())
			continue
		}

		for _, st := range streams {
			for _, msg := range st.Messages {
				if err := s.handleStreamMessage(ctx, stream, msg); err != nil {
					logger.Warn("handle stream message failed", "id", msg.ID, "err", err.Error())
				}
				_ = s.redis.XAck(ctx, stream, group, msg.ID).Err()
			}
		}
	}
}

func (s *gatewayServer) handleStreamMessage(ctx context.Context, stream string, msg redis.XMessage) error {
	env, err := decodeEnvelopeFromStream(msg.Values)
	if err != nil {
		return err
	}
	if env.AgentID == "" {
		return errors.New("missing agent_id")
	}

	a := s.getAgent(env.AgentID)
	if a == nil {
		// Agent offline; accept message as consumed (MVP) but publish a notice.
		s.publishRedisEvent(&protocol.Envelope{
			V:       1,
			Type:    "INVOKE_FAILED",
			AgentID: env.AgentID,
			ReqID:   env.ReqID,
			Ts:      time.Now().Unix(),
			Payload: mustMarshalJSON(map[string]any{"error": "agent_offline"}),
		}, nil)
		return nil
	}

	sendCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.sendToAgent(sendCtx, a, *env)
}

func decodeEnvelopeFromStream(values map[string]any) (*protocol.Envelope, error) {
	// Preferred: single JSON field `envelope`.
	if raw, ok := values["envelope"]; ok {
		switch v := raw.(type) {
		case string:
			return protocol.DecodeEnvelope([]byte(v))
		case []byte:
			return protocol.DecodeEnvelope(v)
		}
	}

	// Fallback: basic field mapping.
	getString := func(key string) string {
		raw := values[key]
		switch v := raw.(type) {
		case string:
			return v
		case []byte:
			return string(v)
		default:
			return ""
		}
	}

	env := &protocol.Envelope{
		V:       1,
		Type:    getString("type"),
		AgentID: getString("agent_id"),
		ReqID:   getString("req_id"),
		Ts:      time.Now().Unix(),
	}

	if env.Type == "" {
		return nil, errors.New("missing type")
	}
	if payload := getString("payload"); payload != "" {
		env.Payload = []byte(payload)
	}
	if err := env.ValidateBasic(); err != nil {
		return nil, err
	}
	return env, nil
}
