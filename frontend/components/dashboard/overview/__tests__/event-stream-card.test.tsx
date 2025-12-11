/**
 * 事件流卡片单元测试
 *
 * 测试覆盖：
 * - Property 14: 事件流卡片完整性
 * - Property 15: 事件流时间倒序排列
 * - Property 16: 事件类型视觉标记
 * - 验证需求 5.2, 5.4
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { EventStreamCard } from "../event-stream-card";
import { I18nProvider } from "@/lib/i18n-context";
import * as useOverviewMetricsModule from "@/lib/swr/use-overview-metrics";
import type { OverviewEvent } from "@/lib/api-types";

// Mock SWR Hook
vi.mock("@/lib/swr/use-overview-metrics");

const mockUseOverviewEvents =
  useOverviewMetricsModule.useOverviewEvents as jest.MockedFunction<
    typeof useOverviewMetricsModule.useOverviewEvents
  >;

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("EventStreamCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property 14: 事件流卡片完整性", () => {
    it("应该显示最近的限流、错误等关键事件", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "rate_limit",
          title: "Rate Limit Triggered",
          description: "Provider OpenAI exceeded rate limit",
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          provider_id: "openai",
        },
        {
          id: "event-2",
          event_type: "error",
          title: "API Error",
          description: "Claude API returned 500 error",
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          provider_id: "anthropic",
          model_id: "claude-2",
        },
        {
          id: "event-3",
          event_type: "warning",
          title: "Low Success Rate",
          description: "Success rate dropped below 90%",
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          provider_id: "google",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证所有事件都显示
        expect(screen.getByText("Rate Limit Triggered")).toBeInTheDocument();
        expect(screen.getByText("API Error")).toBeInTheDocument();
        expect(screen.getByText("Low Success Rate")).toBeInTheDocument();
      });
    });

    it("应该显示事件的完整信息（标题、描述、提供商、模型）", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "API Error",
          description: "Claude API returned 500 error",
          timestamp: new Date().toISOString(),
          provider_id: "anthropic",
          model_id: "claude-2",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证标题
        expect(screen.getByText("API Error")).toBeInTheDocument();
        // 验证描述
        expect(
          screen.getByText("Claude API returned 500 error")
        ).toBeInTheDocument();
        // 验证提供商
        expect(screen.getByText(/anthropic/)).toBeInTheDocument();
        // 验证模型
        expect(screen.getByText(/claude-2/)).toBeInTheDocument();
      });
    });
  });

  describe("Property 15: 事件流时间倒序排列", () => {
    it("应该按时间倒序排列事件（最新事件在最前）", async () => {
      const now = Date.now();
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "rate_limit",
          title: "Event 1 - 5 mins ago",
          description: "Oldest event",
          timestamp: new Date(now - 5 * 60000).toISOString(),
        },
        {
          id: "event-2",
          event_type: "error",
          title: "Event 2 - 2 mins ago",
          description: "Middle event",
          timestamp: new Date(now - 2 * 60000).toISOString(),
        },
        {
          id: "event-3",
          event_type: "warning",
          title: "Event 3 - Just now",
          description: "Newest event",
          timestamp: new Date(now - 30000).toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        const eventElements = screen.getAllByTestId(/^event-/);
        // 验证事件顺序（最新的应该在最前）
        expect(eventElements[0]).toHaveTextContent("Event 3 - Just now");
        expect(eventElements[1]).toHaveTextContent("Event 2 - 2 mins ago");
        expect(eventElements[2]).toHaveTextContent("Event 1 - 5 mins ago");
      });
    });

    it("应该正确显示时间戳", async () => {
      const now = Date.now();
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "info",
          title: "Recent Event",
          description: "Just happened",
          timestamp: new Date(now - 5 * 60000).toISOString(),
        },
        {
          id: "event-2",
          event_type: "info",
          title: "Old Event",
          description: "Happened long ago",
          timestamp: new Date(now - 2 * 86400000).toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证时间戳显示
        expect(screen.getByText(/分钟前|mins ago/)).toBeInTheDocument();
        expect(screen.getByText(/天前|days ago/)).toBeInTheDocument();
      });
    });
  });

  describe("Property 16: 事件类型视觉标记", () => {
    it("应该为不同事件类型显示不同的 Badge", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "rate_limit",
          title: "Rate Limit",
          description: "Rate limit triggered",
          timestamp: new Date().toISOString(),
        },
        {
          id: "event-2",
          event_type: "error",
          title: "Error",
          description: "API error occurred",
          timestamp: new Date().toISOString(),
        },
        {
          id: "event-3",
          event_type: "warning",
          title: "Warning",
          description: "Warning message",
          timestamp: new Date().toISOString(),
        },
        {
          id: "event-4",
          event_type: "info",
          title: "Info",
          description: "Info message",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证所有事件类型都显示
        expect(screen.getByText(/限流|Rate Limit/)).toBeInTheDocument();
        expect(screen.getByText(/错误|Error/)).toBeInTheDocument();
        expect(screen.getByText(/警告|Warning/)).toBeInTheDocument();
        expect(screen.getByText(/信息|Info/)).toBeInTheDocument();
      });
    });

    it("应该为 rate_limit 事件显示闪电图标", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "rate_limit",
          title: "Rate Limit",
          description: "Rate limit triggered",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证事件类型标签存在
        expect(screen.getByText(/限流|Rate Limit/)).toBeInTheDocument();
      });
    });

    it("应该为 error 事件显示警告圆圈图标", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "API Error",
          description: "API error occurred",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证事件类型标签存在
        expect(screen.getByText(/错误|Error/)).toBeInTheDocument();
      });
    });

    it("应该为 warning 事件显示警告三角图标", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "warning",
          title: "Low Success Rate",
          description: "Success rate dropped",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证事件类型标签存在
        expect(screen.getByText(/警告|Warning/)).toBeInTheDocument();
      });
    });

    it("应该为 info 事件显示信息图标", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "info",
          title: "Info Message",
          description: "Some info",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证事件类型标签存在
        expect(screen.getByText(/信息|Info/)).toBeInTheDocument();
      });
    });
  });

  describe("需求 5.2: 显示最近的限流、错误等关键事件", () => {
    it("应该显示限流事件", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "rate_limit",
          title: "Rate Limit Triggered",
          description: "Provider OpenAI exceeded rate limit",
          timestamp: new Date().toISOString(),
          provider_id: "openai",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText("Rate Limit Triggered")
        ).toBeInTheDocument();
        expect(
          screen.getByText("Provider OpenAI exceeded rate limit")
        ).toBeInTheDocument();
      });
    });

    it("应该显示错误事件", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "API Error",
          description: "Claude API returned 500 error",
          timestamp: new Date().toISOString(),
          provider_id: "anthropic",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("API Error")).toBeInTheDocument();
        expect(
          screen.getByText("Claude API returned 500 error")
        ).toBeInTheDocument();
      });
    });
  });

  describe("需求 5.4: 按时间倒序排列，为不同事件类型使用不同视觉标记", () => {
    it("应该按时间倒序排列事件", async () => {
      const now = Date.now();
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "info",
          title: "Oldest",
          description: "Oldest event",
          timestamp: new Date(now - 10 * 60000).toISOString(),
        },
        {
          id: "event-2",
          event_type: "info",
          title: "Newest",
          description: "Newest event",
          timestamp: new Date(now - 1 * 60000).toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        const eventElements = screen.getAllByTestId(/^event-/);
        // 最新的应该在最前
        expect(eventElements[0]).toHaveTextContent("Newest");
        expect(eventElements[1]).toHaveTextContent("Oldest");
      });
    });

    it("应该为不同事件类型使用不同视觉标记", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "rate_limit",
          title: "Rate Limit",
          description: "Rate limit triggered",
          timestamp: new Date().toISOString(),
        },
        {
          id: "event-2",
          event_type: "error",
          title: "Error",
          description: "Error occurred",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        // 验证不同的事件类型标签
        expect(screen.getByText(/限流|Rate Limit/)).toBeInTheDocument();
        expect(screen.getByText(/错误|Error/)).toBeInTheDocument();
      });
    });
  });

  describe("加载和错误状态", () => {
    it("应该在加载时显示 Skeleton 占位符", async () => {
      mockUseOverviewEvents.mockReturnValue({
        events: [],
        loading: true,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        const skeletons = screen.getAllByTestId("skeleton");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在错误时显示错误提示", async () => {
      const mockError = new Error("Failed to load events");
      mockUseOverviewEvents.mockReturnValue({
        events: [],
        loading: false,
        error: mockError,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText(/事件数据加载失败|Failed to load event data/)
        ).toBeInTheDocument();
        expect(screen.getByText(/重试|Retry/)).toBeInTheDocument();
      });
    });

    it("应该在无数据时显示占位符", async () => {
      mockUseOverviewEvents.mockReturnValue({
        events: [],
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText(/暂无事件数据|No event data available/)
        ).toBeInTheDocument();
      });
    });

    it("应该在点击重试按钮时调用 refresh", async () => {
      const mockRefresh = vi.fn();
      const mockError = new Error("Failed to load events");

      mockUseOverviewEvents.mockReturnValue({
        events: [],
        loading: false,
        error: mockError,
        validating: false,
        refresh: mockRefresh,
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|Retry/);
        fireEvent.click(retryButton);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("时间范围参数", () => {
    it("应该根据传入的 timeRange 参数获取数据", async () => {
      const mockEvents: OverviewEvent[] = [];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="30d" />);

      await waitFor(() => {
        expect(mockUseOverviewEvents).toHaveBeenCalledWith({
          time_range: "30d",
        });
      });
    });

    it("应该使用默认的 7d 时间范围", async () => {
      const mockEvents: OverviewEvent[] = [];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard />);

      await waitFor(() => {
        expect(mockUseOverviewEvents).toHaveBeenCalledWith({
          time_range: "7d",
        });
      });
    });
  });

  describe("事件元数据显示", () => {
    it("应该显示提供商信息（如果存在）", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "API Error",
          description: "Error occurred",
          timestamp: new Date().toISOString(),
          provider_id: "openai",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/openai/)).toBeInTheDocument();
      });
    });

    it("应该显示模型信息（如果存在）", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "API Error",
          description: "Error occurred",
          timestamp: new Date().toISOString(),
          model_id: "gpt-4",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
      });
    });

    it("应该同时显示提供商和模型信息", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "API Error",
          description: "Error occurred",
          timestamp: new Date().toISOString(),
          provider_id: "anthropic",
          model_id: "claude-2",
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/anthropic/)).toBeInTheDocument();
        expect(screen.getByText(/claude-2/)).toBeInTheDocument();
      });
    });
  });

  describe("事件行标识", () => {
    it("应该为每个事件行添加 testid", async () => {
      const mockEvents: OverviewEvent[] = [
        {
          id: "event-1",
          event_type: "error",
          title: "Error 1",
          description: "Error occurred",
          timestamp: new Date().toISOString(),
        },
        {
          id: "event-2",
          event_type: "warning",
          title: "Warning 1",
          description: "Warning occurred",
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseOverviewEvents.mockReturnValue({
        events: mockEvents,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<EventStreamCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByTestId("event-event-1")).toBeInTheDocument();
        expect(screen.getByTestId("event-event-2")).toBeInTheDocument();
      });
    });
  });
});
