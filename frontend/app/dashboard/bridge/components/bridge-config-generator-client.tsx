"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useI18n } from "@/lib/i18n-context";

type MCPServerForm = {
  id: string;
  name: string;
  command: string;
  argsText: string;
  envText: string;
};

function defaultTunnelUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BRIDGE_TUNNEL_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  const base = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL;
  if (base && base.trim()) {
    try {
      const u = new URL(base.trim());
      u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
      u.pathname = "/bridge/tunnel";
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch {
      // fall through
    }
  }

  return "wss://api.your-ai-chat.com/bridge/tunnel";
}

function yamlQuoted(value: string): string {
  return JSON.stringify(String(value ?? ""));
}

function splitLines(value: string): string[] {
  return (value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseEnvJSON(value: string): Record<string, string> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("env must be an object");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, any>)) {
    if (!k) continue;
    out[String(k)] = String(v ?? "");
  }
  return out;
}

function buildConfigYaml(input: {
  serverUrl: string;
  token: string;
  agentId: string;
  agentLabel: string;
  reconnectInitial: string;
  reconnectMax: string;
  chunkBufferBytes: number;
  chunkMaxFrameBytes: number;
  servers: Array<{
    name: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`version: ${yamlQuoted("1.0")}`);
  lines.push("");
  lines.push("server:");
  lines.push(`  url: ${yamlQuoted(input.serverUrl)}`);
  lines.push(`  token: ${yamlQuoted(input.token)}`);
  lines.push(`  reconnect_initial: ${yamlQuoted(input.reconnectInitial)}`);
  lines.push(`  reconnect_max: ${yamlQuoted(input.reconnectMax)}`);
  lines.push("");
  lines.push("agent:");
  lines.push(`  id: ${yamlQuoted(input.agentId)}`);
  lines.push(`  label: ${yamlQuoted(input.agentLabel)}`);
  lines.push(`  chunk_buffer_bytes: ${Math.max(1, Math.floor(input.chunkBufferBytes || 0))}`);
  lines.push(`  chunk_max_frame_bytes: ${Math.max(1, Math.floor(input.chunkMaxFrameBytes || 0))}`);
  lines.push("");
  lines.push("mcp_servers:");

  if (!input.servers.length) {
    lines.push("  []");
    return lines.join("\n");
  }

  for (const s of input.servers) {
    lines.push(`  - name: ${yamlQuoted(s.name)}`);
    lines.push(`    command: ${yamlQuoted(s.command)}`);
    lines.push("    args:");
    if (s.args.length) {
      for (const arg of s.args) {
        lines.push(`      - ${yamlQuoted(arg)}`);
      }
    } else {
      lines.push("      []");
    }
    const envEntries = Object.entries(s.env || {}).filter(([k]) => k);
    if (envEntries.length) {
      lines.push("    env:");
      for (const [k, v] of envEntries) {
        lines.push(`      ${k}: ${yamlQuoted(v)}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function BridgeConfigGeneratorClient() {
  const { t } = useI18n();

  const [serverUrl, setServerUrl] = useState(() => defaultTunnelUrl());
  const [token, setToken] = useState("");
  const [agentId, setAgentId] = useState("my-agent");
  const [agentLabel, setAgentLabel] = useState("My Agent");

  const [reconnectInitial, setReconnectInitial] = useState("1s");
  const [reconnectMax, setReconnectMax] = useState("60s");
  const [chunkBufferBytes, setChunkBufferBytes] = useState<number>(4 * 1024 * 1024);
  const [chunkMaxFrameBytes, setChunkMaxFrameBytes] = useState<number>(16 * 1024);

  const [servers, setServers] = useState<MCPServerForm[]>([
    {
      id: crypto.randomUUID(),
      name: "filesystem",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-filesystem\n/Users/me/Documents",
      envText: "",
    },
  ]);

  const computed = useMemo(() => {
    const parsedServers = servers
      .map((s) => {
        const args = splitLines(s.argsText);
        const env = parseEnvJSON(s.envText);
        return {
          name: s.name.trim(),
          command: s.command.trim(),
          args,
          env,
        };
      })
      .filter((s) => s.name && s.command);

    return buildConfigYaml({
      serverUrl,
      token,
      agentId,
      agentLabel,
      reconnectInitial,
      reconnectMax,
      chunkBufferBytes,
      chunkMaxFrameBytes,
      servers: parsedServers,
    });
  }, [
    agentId,
    agentLabel,
    chunkBufferBytes,
    chunkMaxFrameBytes,
    reconnectInitial,
    reconnectMax,
    serverUrl,
    servers,
    token,
  ]);

  const download = () => {
    try {
      for (const s of servers) {
        parseEnvJSON(s.envText);
      }
    } catch {
      toast.error(t("bridge.error.invalid_json"));
      return;
    }

    const blob = new Blob([computed], { type: "application/x-yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("bridge.config.title")}</CardTitle>
          <CardDescription>{t("bridge.config.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">{t("bridge.config.server_url")}</div>
            <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">{t("bridge.config.token")}</div>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("bridge.config.token_placeholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">{t("bridge.config.agent_id")}</div>
              <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">{t("bridge.config.agent_label")}</div>
              <Input value={agentLabel} onChange={(e) => setAgentLabel(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">{t("bridge.config.reconnect_initial")}</div>
              <Input value={reconnectInitial} onChange={(e) => setReconnectInitial(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">{t("bridge.config.reconnect_max")}</div>
              <Input value={reconnectMax} onChange={(e) => setReconnectMax(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">{t("bridge.config.chunk_buffer_bytes")}</div>
              <Input
                value={String(chunkBufferBytes)}
                onChange={(e) => setChunkBufferBytes(Number(e.target.value || 0))}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">{t("bridge.config.chunk_max_frame_bytes")}</div>
              <Input
                value={String(chunkMaxFrameBytes)}
                onChange={(e) => setChunkMaxFrameBytes(Number(e.target.value || 0))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("bridge.config.mcp_servers")}</span>
            <Button
              variant="outline"
              onClick={() =>
                setServers((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    command: "",
                    argsText: "",
                    envText: "",
                  },
                ])
              }
            >
              {t("bridge.config.add_server")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {servers.map((s, idx) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>
                    {t("bridge.config.server_name")} #{idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setServers((prev) => prev.filter((x) => x.id !== s.id))}
                    disabled={servers.length <= 1}
                  >
                    {t("bridge.config.remove_server")}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">{t("bridge.config.server_name")}</div>
                    <Input
                      value={s.name}
                      onChange={(e) =>
                        setServers((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">{t("bridge.config.server_command")}</div>
                    <Input
                      value={s.command}
                      onChange={(e) =>
                        setServers((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, command: e.target.value } : x))
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">{t("bridge.config.server_args")}</div>
                  <Textarea
                    value={s.argsText}
                    onChange={(e) =>
                      setServers((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, argsText: e.target.value } : x))
                      )
                    }
                    className="min-h-20 font-mono text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">{t("bridge.config.server_env")}</div>
                  <Textarea
                    value={s.envText}
                    onChange={(e) =>
                      setServers((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, envText: e.target.value } : x))
                      )
                    }
                    placeholder={t("bridge.config.env_placeholder")}
                    className="min-h-16 font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("bridge.config.preview")}</span>
            <Button onClick={download}>{t("bridge.config.download")}</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={computed} readOnly className="min-h-72 font-mono text-xs" />
        </CardContent>
      </Card>
    </div>
  );
}
