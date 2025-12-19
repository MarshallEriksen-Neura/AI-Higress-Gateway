import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SWRConfig } from 'swr';
import { useEval, useCreateEval, useSubmitRating } from '../use-evals';
import { evalService } from '@/http/eval';
import type { EvalResponse, RatingResponse } from '@/lib/api-types';

// Mock evalService
vi.mock('@/http/eval', () => ({
  evalService: {
    createEval: vi.fn(),
    getEval: vi.fn(),
    submitRating: vi.fn(),
  },
}));

// SWR provider wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => children;

describe('useEval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when evalId is null', () => {
    const { result } = renderHook(() => useEval(null), { wrapper });

    expect(result.current.eval).toBeUndefined();
    expect(evalService.getEval).not.toHaveBeenCalled();
  });

  it('should provide polling interval state', () => {
    const { result } = renderHook(() => useEval('eval-1'), { wrapper });

    // 初始轮询间隔应该是 1000ms
    expect(result.current.currentPollingInterval).toBe(1000);
  });
});

describe('useCreateEval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create eval', async () => {
    const mockEval: EvalResponse = {
      eval_id: 'eval-1',
      status: 'running',
      baseline_run_id: 'run-1',
      challengers: [],
      explanation: { summary: 'Test' },
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(evalService.createEval).mockResolvedValue(mockEval);

    const { result } = renderHook(() => useCreateEval(), { wrapper });

    const response = await result.current({
      project_id: 'proj-1',
      assistant_id: 'asst-1',
      conversation_id: 'conv-1',
      message_id: 'msg-1',
      baseline_run_id: 'run-1',
    });

    expect(response).toEqual(mockEval);
    expect(evalService.createEval).toHaveBeenCalledWith({
      project_id: 'proj-1',
      assistant_id: 'asst-1',
      conversation_id: 'conv-1',
      message_id: 'msg-1',
      baseline_run_id: 'run-1',
    });
  });
});

describe('useSubmitRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit rating', async () => {
    const mockRating: RatingResponse = {
      eval_id: 'eval-1',
      winner_run_id: 'run-2',
      reason_tags: ['accurate', 'fast'],
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(evalService.submitRating).mockResolvedValue(mockRating);

    const { result } = renderHook(() => useSubmitRating('eval-1'), { wrapper });

    const response = await result.current({
      winner_run_id: 'run-2',
      reason_tags: ['accurate', 'fast'],
    });

    expect(response).toEqual(mockRating);
    expect(evalService.submitRating).toHaveBeenCalledWith('eval-1', {
      winner_run_id: 'run-2',
      reason_tags: ['accurate', 'fast'],
    });
  });

  it('should throw error when evalId is null', async () => {
    const { result } = renderHook(() => useSubmitRating(null), { wrapper });

    await expect(
      result.current({
        winner_run_id: 'run-2',
        reason_tags: ['accurate'],
      })
    ).rejects.toThrow('Eval ID is required');
  });

  it('should handle submit errors', async () => {
    const error = new Error('Failed to submit rating');
    vi.mocked(evalService.submitRating).mockRejectedValue(error);

    const { result } = renderHook(() => useSubmitRating('eval-1'), { wrapper });

    await expect(
      result.current({
        winner_run_id: 'run-2',
        reason_tags: ['accurate'],
      })
    ).rejects.toThrow('Failed to submit rating');
  });
});
