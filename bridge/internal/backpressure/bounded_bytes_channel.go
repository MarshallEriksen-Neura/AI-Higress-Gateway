package backpressure

import (
	"context"
	"sync"
)

// BoundedBytesChannel is a best-effort queue for []byte messages with both:
// - a max message count (buffer size)
// - a max total queued bytes limit
//
// When full, producers can drop messages by using TrySend (non-blocking).
type BoundedBytesChannel struct {
	ch chan []byte

	mu       sync.Mutex
	maxBytes int64
	bytes    int64
	closed   bool
}

func NewBoundedBytesChannel(maxBytes int64, maxMessages int) *BoundedBytesChannel {
	if maxBytes <= 0 {
		maxBytes = 4 * 1024 * 1024
	}
	if maxMessages <= 0 {
		maxMessages = 256
	}
	return &BoundedBytesChannel{
		ch:       make(chan []byte, maxMessages),
		maxBytes: maxBytes,
	}
}

func (q *BoundedBytesChannel) TrySend(msg []byte) bool {
	if q == nil || len(msg) == 0 {
		return false
	}

	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return false
	}
	if q.bytes+int64(len(msg)) > q.maxBytes {
		q.mu.Unlock()
		return false
	}
	select {
	case q.ch <- msg:
		q.bytes += int64(len(msg))
		q.mu.Unlock()
		return true
	default:
		q.mu.Unlock()
		return false
	}
}

func (q *BoundedBytesChannel) Receive(ctx context.Context) ([]byte, bool) {
	if q == nil {
		return nil, false
	}
	select {
	case <-ctx.Done():
		return nil, false
	case msg, ok := <-q.ch:
		if !ok {
			return nil, false
		}
		q.mu.Lock()
		q.bytes -= int64(len(msg))
		if q.bytes < 0 {
			q.bytes = 0
		}
		q.mu.Unlock()
		return msg, true
	}
}

func (q *BoundedBytesChannel) Close() {
	if q == nil {
		return
	}
	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return
	}
	q.closed = true
	close(q.ch)
	q.mu.Unlock()
}
