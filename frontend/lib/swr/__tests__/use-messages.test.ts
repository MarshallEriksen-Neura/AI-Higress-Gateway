import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useClearConversationMessages,
  useMessages,
  useRun,
  useSendMessage,
  useSendMessageToConversation,
} from '../use-messages';
import { messageService } from '@/http/message';
import type { MessagesResponse, RunDetail, SendMessageResponse } from '@/lib/api-types';

// Mock messageService
vi.mock('@/http/message', () => ({
  messageService: {
    getMessages: vi.fn(),
    getRun: vi.fn(),
    sendMessage: vi.fn(),
    clearConversationMessages: vi.fn(),
  },
}));

// Mock SWR provider wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => children;

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch messages with pagination support', async () => {
    const mockResponse: MessagesResponse = {
      items: [
        {
          message: {
            message_id: 'msg-1',
            conversation_id: 'conv-1',
            role: 'user',
            content: 'Hello',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      ],
      next_cursor: 'cursor-1',
    };

    vi.mocked(messageService.getMessages).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useMessages('conv-1', { limit: 10 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual(mockResponse.items);
    expect(result.current.nextCursor).toBe('cursor-1');
    expect(messageService.getMessages).toHaveBeenCalledWith('conv-1', { limit: 10 });
  });

  it('should not fetch when conversationId is null', () => {
    const { result } = renderHook(() => useMessages(null), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(messageService.getMessages).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch messages');
    vi.mocked(messageService.getMessages).mockRejectedValue(error);

    const { result } = renderHook(() => useMessages('conv-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});

describe('useRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch run details lazily', async () => {
    const mockRun: RunDetail = {
      run_id: 'run-1',
      requested_logical_model: 'gpt-4',
      status: 'succeeded',
      output_preview: 'Hello!',
      latency: 1000,
      request: { messages: [] },
      response: { choices: [] },
      output_text: 'Hello!',
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
      cost: 0.001,
    };

    vi.mocked(messageService.getRun).mockResolvedValue(mockRun);

    const { result } = renderHook(() => useRun('run-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.run).toEqual(mockRun);
    expect(messageService.getRun).toHaveBeenCalledWith('run-1');
  });

  it('should not fetch when runId is null', () => {
    const { result } = renderHook(() => useRun(null), { wrapper });

    expect(result.current.run).toBeUndefined();
    expect(messageService.getRun).not.toHaveBeenCalled();
  });
});

describe('useSendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message and return response', async () => {
    const mockResponse: SendMessageResponse = {
      message_id: 'msg-2',
      baseline_run: {
        run_id: 'run-2',
        requested_logical_model: 'gpt-4',
        status: 'succeeded',
        output_preview: 'Hi there!',
        latency: 1200,
      },
    };

    vi.mocked(messageService.sendMessage).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSendMessage('conv-1'), { wrapper });

    const response = await result.current({ content: 'Hello' });

    expect(response).toEqual(mockResponse);
    expect(messageService.sendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Hello',
    });
  });

  it('should pass override_logical_model when provided', async () => {
    const mockResponse: SendMessageResponse = {
      message_id: 'msg-2',
      baseline_run: {
        run_id: 'run-2',
        requested_logical_model: 'gpt-4',
        status: 'succeeded',
        output_preview: 'Hi there!',
        latency: 1200,
      },
    };

    vi.mocked(messageService.sendMessage).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSendMessage('conv-1', undefined, 'test-model'),
      { wrapper }
    );

    await result.current({ content: 'Hello' });

    expect(messageService.sendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Hello',
      override_logical_model: 'test-model',
    });
  });

  it('should throw error when conversationId is null', async () => {
    const { result } = renderHook(() => useSendMessage(null), { wrapper });

    await expect(result.current({ content: 'Hello' })).rejects.toThrow(
      'Conversation ID is required'
    );
  });

  it('should handle send errors', async () => {
    const error = new Error('Failed to send message');
    vi.mocked(messageService.sendMessage).mockRejectedValue(error);

    const { result } = renderHook(() => useSendMessage('conv-1'), { wrapper });

    await expect(result.current({ content: 'Hello' })).rejects.toThrow(
      'Failed to send message'
    );
  });
});

describe('useSendMessageToConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message with provided conversationId', async () => {
    const mockResponse: SendMessageResponse = {
      message_id: 'msg-2',
      baseline_run: {
        run_id: 'run-2',
        requested_logical_model: 'gpt-4',
        status: 'succeeded',
        output_preview: 'Hi there!',
        latency: 1200,
      },
    };

    vi.mocked(messageService.sendMessage).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSendMessageToConversation(), { wrapper });

    const response = await result.current('conv-1', { content: 'Hello' });

    expect(response).toEqual(mockResponse);
    expect(messageService.sendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Hello',
    });
  });

  it('should pass override_logical_model when provided', async () => {
    const mockResponse: SendMessageResponse = {
      message_id: 'msg-2',
      baseline_run: {
        run_id: 'run-2',
        requested_logical_model: 'gpt-4',
        status: 'succeeded',
        output_preview: 'Hi there!',
        latency: 1200,
      },
    };

    vi.mocked(messageService.sendMessage).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSendMessageToConversation(undefined, 'test-model'),
      { wrapper }
    );

    await result.current('conv-1', { content: 'Hello' });

    expect(messageService.sendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Hello',
      override_logical_model: 'test-model',
    });
  });
});

describe('useClearConversationMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear messages and keep conversation id', async () => {
    vi.mocked(messageService.clearConversationMessages).mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useClearConversationMessages('assistant-1'),
      { wrapper }
    );

    await result.current('conv-1');

    expect(messageService.clearConversationMessages).toHaveBeenCalledWith('conv-1');
  });
});
