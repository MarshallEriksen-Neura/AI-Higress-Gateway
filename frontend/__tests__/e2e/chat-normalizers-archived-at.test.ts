import { describe, expect, it } from 'vitest';

import { normalizeConversation } from '@/lib/normalizers/chat-normalizers';

describe('chat normalizers: archived_at', () => {
  it('normalizeConversation: archived_at 缺失时默认不归档', () => {
    const backend = {
      conversation_id: 'conv-1',
      assistant_id: 'asst-1',
      project_id: 'proj-1',
      title: 't',
      // archived_at: undefined（后端字段缺失的兼容场景）
      last_activity_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    } as any;

    expect(normalizeConversation(backend).archived).toBe(false);
  });

  it('normalizeConversation: archived_at 为 null 时不归档', () => {
    const backend = {
      conversation_id: 'conv-1',
      assistant_id: 'asst-1',
      project_id: 'proj-1',
      title: 't',
      archived_at: null,
      last_activity_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    expect(normalizeConversation(backend).archived).toBe(false);
  });

  it('normalizeConversation: archived_at 有值时归档', () => {
    const backend = {
      conversation_id: 'conv-1',
      assistant_id: 'asst-1',
      project_id: 'proj-1',
      title: 't',
      archived_at: '2025-01-01T00:00:00Z',
      last_activity_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    expect(normalizeConversation(backend).archived).toBe(true);
  });
});

