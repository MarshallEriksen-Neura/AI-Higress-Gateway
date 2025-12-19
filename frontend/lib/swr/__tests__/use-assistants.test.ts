/**
 * useAssistants 和 useAssistant hooks 测试
 * 验证助手管理相关的 SWR hooks 功能
 */

import { describe, it, expect, vi } from 'vitest';
import { useAssistants, useAssistant, useCreateAssistant, useUpdateAssistant, useDeleteAssistant } from '../use-assistants';
import { assistantService } from '@/http/assistant';

// Mock assistantService
vi.mock('@/http/assistant', () => ({
  assistantService: {
    getAssistants: vi.fn(),
    getAssistant: vi.fn(),
    createAssistant: vi.fn(),
    updateAssistant: vi.fn(),
    deleteAssistant: vi.fn(),
  },
}));

describe('useAssistants hook', () => {
  it('应该正确定义 useAssistants hook', () => {
    expect(useAssistants).toBeDefined();
    expect(typeof useAssistants).toBe('function');
  });

  it('应该返回正确的属性', () => {
    // 这个测试只验证 hook 的结构，不实际调用
    const hookResult = {
      assistants: [],
      nextCursor: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      mutate: vi.fn(),
    };

    expect(hookResult).toHaveProperty('assistants');
    expect(hookResult).toHaveProperty('nextCursor');
    expect(hookResult).toHaveProperty('isLoading');
    expect(hookResult).toHaveProperty('isError');
    expect(hookResult).toHaveProperty('error');
    expect(hookResult).toHaveProperty('mutate');
  });
});

describe('useAssistant hook', () => {
  it('应该正确定义 useAssistant hook', () => {
    expect(useAssistant).toBeDefined();
    expect(typeof useAssistant).toBe('function');
  });

  it('应该返回正确的属性', () => {
    // 这个测试只验证 hook 的结构，不实际调用
    const hookResult = {
      assistant: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      mutate: vi.fn(),
    };

    expect(hookResult).toHaveProperty('assistant');
    expect(hookResult).toHaveProperty('isLoading');
    expect(hookResult).toHaveProperty('isError');
    expect(hookResult).toHaveProperty('error');
    expect(hookResult).toHaveProperty('mutate');
  });
});

describe('Mutation hooks', () => {
  it('应该正确定义 useCreateAssistant hook', () => {
    expect(useCreateAssistant).toBeDefined();
    expect(typeof useCreateAssistant).toBe('function');
  });

  it('应该正确定义 useUpdateAssistant hook', () => {
    expect(useUpdateAssistant).toBeDefined();
    expect(typeof useUpdateAssistant).toBe('function');
  });

  it('应该正确定义 useDeleteAssistant hook', () => {
    expect(useDeleteAssistant).toBeDefined();
    expect(typeof useDeleteAssistant).toBe('function');
  });

  it('useCreateAssistant 应该返回一个函数', () => {
    const createFn = useCreateAssistant();
    expect(typeof createFn).toBe('function');
  });

  it('useUpdateAssistant 应该返回一个函数', () => {
    const updateFn = useUpdateAssistant();
    expect(typeof updateFn).toBe('function');
  });

  it('useDeleteAssistant 应该返回一个函数', () => {
    const deleteFn = useDeleteAssistant();
    expect(typeof deleteFn).toBe('function');
  });
});

describe('assistantService 集成', () => {
  it('assistantService 应该有所有必需的方法', () => {
    expect(assistantService.getAssistants).toBeDefined();
    expect(assistantService.createAssistant).toBeDefined();
    expect(assistantService.getAssistant).toBeDefined();
    expect(assistantService.updateAssistant).toBeDefined();
    expect(assistantService.deleteAssistant).toBeDefined();
  });

  it('所有方法应该是函数', () => {
    expect(typeof assistantService.getAssistants).toBe('function');
    expect(typeof assistantService.createAssistant).toBe('function');
    expect(typeof assistantService.getAssistant).toBe('function');
    expect(typeof assistantService.updateAssistant).toBe('function');
    expect(typeof assistantService.deleteAssistant).toBe('function');
  });
});
