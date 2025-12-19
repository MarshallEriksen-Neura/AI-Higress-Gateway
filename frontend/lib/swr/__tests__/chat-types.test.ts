/**
 * 聊天助手系统类型定义测试
 * 验证所有类型定义和服务导出是否正确
 */

import { describe, it, expect } from 'vitest';
import type {
  Assistant,
  Conversation,
  Message,
  RunSummary,
  RunDetail,
  EvalResponse,
  EvalConfig,
} from '@/lib/api-types';
import {
  assistantService,
  conversationService,
  messageService,
  evalService,
  evalConfigService,
} from '@/http';

describe('聊天助手系统类型定义', () => {
  it('应该正确导出助手相关类型', () => {
    const assistant: Assistant = {
      assistant_id: 'test-id',
      project_id: 'project-id',
      name: 'Test Assistant',
      default_logical_model: 'auto',
      archived: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(assistant.assistant_id).toBe('test-id');
    expect(assistant.name).toBe('Test Assistant');
  });

  it('应该正确导出会话相关类型', () => {
    const conversation: Conversation = {
      conversation_id: 'conv-id',
      assistant_id: 'asst-id',
      project_id: 'project-id',
      archived: false,
      last_activity_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(conversation.conversation_id).toBe('conv-id');
    expect(conversation.archived).toBe(false);
  });

  it('应该正确导出消息相关类型', () => {
    const message: Message = {
      message_id: 'msg-id',
      conversation_id: 'conv-id',
      role: 'user',
      content: 'Hello',
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello');
  });

  it('应该正确导出 Run 相关类型', () => {
    const runSummary: RunSummary = {
      run_id: 'run-id',
      requested_logical_model: 'gpt-4',
      status: 'succeeded',
      output_preview: 'Hello world',
      latency: 1000,
    };

    const runDetail: RunDetail = {
      ...runSummary,
      request: { messages: [] },
      response: { choices: [] },
      output_text: 'Hello world',
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
    };

    expect(runSummary.status).toBe('succeeded');
    expect(runDetail.total_tokens).toBe(30);
  });

  it('应该正确导出评测相关类型', () => {
    const evalResponse: EvalResponse = {
      eval_id: 'eval-id',
      status: 'running',
      baseline_run_id: 'run-id',
      challengers: [],
      explanation: {
        summary: 'Test explanation',
      },
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(evalResponse.status).toBe('running');
    expect(evalResponse.explanation.summary).toBe('Test explanation');
  });

  it('应该正确导出评测配置类型', () => {
    const evalConfig: EvalConfig = {
      id: 'config-id',
      project_id: 'project-id',
      enabled: true,
      max_challengers: 2,
      provider_scopes: ['private', 'shared'],
      candidate_logical_models: ['gpt-4', 'claude-3-opus'],
      cooldown_seconds: 60,
      project_ai_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(evalConfig.enabled).toBe(true);
    expect(evalConfig.max_challengers).toBe(2);
  });
});

describe('聊天助手系统服务导出', () => {
  it('应该正确导出 assistantService', () => {
    expect(assistantService).toBeDefined();
    expect(assistantService.getAssistants).toBeDefined();
    expect(assistantService.createAssistant).toBeDefined();
    expect(assistantService.getAssistant).toBeDefined();
    expect(assistantService.updateAssistant).toBeDefined();
    expect(assistantService.deleteAssistant).toBeDefined();
  });

  it('应该正确导出 conversationService', () => {
    expect(conversationService).toBeDefined();
    expect(conversationService.getConversations).toBeDefined();
    expect(conversationService.createConversation).toBeDefined();
    expect(conversationService.getConversation).toBeDefined();
    expect(conversationService.updateConversation).toBeDefined();
    expect(conversationService.deleteConversation).toBeDefined();
  });

  it('应该正确导出 messageService', () => {
    expect(messageService).toBeDefined();
    expect(messageService.getMessages).toBeDefined();
    expect(messageService.sendMessage).toBeDefined();
    expect(messageService.getRun).toBeDefined();
  });

  it('应该正确导出 evalService', () => {
    expect(evalService).toBeDefined();
    expect(evalService.createEval).toBeDefined();
    expect(evalService.getEval).toBeDefined();
    expect(evalService.submitRating).toBeDefined();
  });

  it('应该正确导出 evalConfigService', () => {
    expect(evalConfigService).toBeDefined();
    expect(evalConfigService.getEvalConfig).toBeDefined();
    expect(evalConfigService.updateEvalConfig).toBeDefined();
  });
});
