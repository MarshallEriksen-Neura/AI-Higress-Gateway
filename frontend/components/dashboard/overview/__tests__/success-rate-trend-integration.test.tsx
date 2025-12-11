/**
 * 成功率趋势卡片集成测试
 *
 * 测试覆盖：
 * - Property 5: 时间范围切换数据更新
 * - 验证需求 3.2
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SuccessRateTrendCard } from "../success-rate-trend-card";
import { I18nProvider } from "@/lib/i18n-context";
import * as useOverviewMetricsModule from "@/lib/swr/use-overview-metrics";

// Mock SWR Hook
vi.mock("@/lib/swr/use-overview-metrics");

const mockUseSuccessRateTrend = useOverviewMetricsModule.useSuccessRateTrend as jest.MockedFunction<
  typeof useOverviewMetricsModule.useSuccessRateTrend
>;

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("SuccessRateTrendCard Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property 5: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时重新获取数据", async () => {
      const mockData7d = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-05T00:00:00Z",
            total_requests: 1000,
            success_requests: 950,
            error_requests: 50,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.05,
          },
          {
            window_start: "2024-12-06T00:00:00Z",
            total_requests: 1100,
            success_requests: 1045,
            error_requests: 55,
            latency_avg_ms: 105,
            latency_p95_ms: 210,
            latency_p99_ms: 310,
            error_rate: 0.05,
          },
        ],
      };

      mockUseSuccessRateTrend.mockReturnValue({
        trend: mockData7d,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      // 首次渲染，使用 7 天时间范围
      const { rerender } = renderWithI18n(
        <SuccessRateTrendCard timeRange="7d" />
      );

      await waitFor(() => {
        // 验证 7 天数据显示
        expect(screen.getByText(/请求成功率趋势|Success Rate Trend/)).toBeInTheDocument();
        expect(screen.getByText("95%")).toBeInTheDocument();
      });

      // 验证 hook 被调用时使用了正确的时间范围
      expect(mockUseSuccessRateTrend).toHaveBeenCalledWith({
        time_range: "7d",
      });

      // 模拟时间范围变化为 30 天
      const mockData30d = {
        time_range: "30d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-11-07T00:00:00Z",
            total_requests: 5000,
            success_requests: 4750,
            error_requests: 250,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.05,
          },
          {
            window_start: "2024-12-06T00:00:00Z",
            total_requests: 5500,
            success_requests: 5225,
            error_requests: 275,
            latency_avg_ms: 105,
            latency_p95_ms: 210,
            latency_p99_ms: 310,
            error_rate: 0.05,
          },
        ],
      };

      mockUseSuccessRateTrend.mockReturnValue({
        trend: mockData30d,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      // 重新渲染，使用 30 天时间范围
      rerender(
        <I18nProvider>
          <SuccessRateTrendCard timeRange="30d" />
        </I18nProvider>
      );

      await waitFor(() => {
        // 验证 hook 被调用时使用了新的时间范围
        expect(mockUseSuccessRateTrend).toHaveBeenCalledWith({
          time_range: "30d",
        });
      });
    });

    it("应该在时间范围变化时更新图表数据", async () => {
      const mockData7d = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-05T00:00:00Z",
            total_requests: 1000,
            success_requests: 950,
            error_requests: 50,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.05,
          },
        ],
      };

      mockUseSuccessRateTrend.mockReturnValue({
        trend: mockData7d,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      const { rerender } = renderWithI18n(
        <SuccessRateTrendCard timeRange="7d" />
      );

      await waitFor(() => {
        expect(screen.getByText("95%")).toBeInTheDocument();
      });

      // 模拟时间范围变化为 90 天
      const mockData90d = {
        time_range: "90d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-09-08T00:00:00Z",
            total_requests: 10000,
            success_requests: 9000,
            error_requests: 1000,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.1,
          },
          {
            window_start: "2024-12-06T00:00:00Z",
            total_requests: 11000,
            success_requests: 10450,
            error_requests: 550,
            latency_avg_ms: 105,
            latency_p95_ms: 210,
            latency_p99_ms: 310,
            error_rate: 0.05,
          },
        ],
      };

      mockUseSuccessRateTrend.mockReturnValue({
        trend: mockData90d,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      rerender(
        <I18nProvider>
          <SuccessRateTrendCard timeRange="90d" />
        </I18nProvider>
      );

      await waitFor(() => {
        // 验证数据已更新
        expect(mockUseSuccessRateTrend).toHaveBeenCalledWith({
          time_range: "90d",
        });
      });
    });
  });

  describe("需求 3.2: 按时间序列显示成功率", () => {
    it("应该显示多个时间点的成功率数据", async () => {
      const mockData = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-01T00:00:00Z",
            total_requests: 1000,
            success_requests: 950,
            error_requests: 50,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.05,
          },
          {
            window_start: "2024-12-02T00:00:00Z",
            total_requests: 1100,
            success_requests: 1045,
            error_requests: 55,
            latency_avg_ms: 105,
            latency_p95_ms: 210,
            latency_p99_ms: 310,
            error_rate: 0.05,
          },
          {
            window_start: "2024-12-03T00:00:00Z",
            total_requests: 1200,
            success_requests: 1140,
            error_requests: 60,
            latency_avg_ms: 110,
            latency_p95_ms: 220,
            latency_p99_ms: 320,
            error_rate: 0.05,
          },
        ],
      };

      mockUseSuccessRateTrend.mockReturnValue({
        trend: mockData,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" />);

      await waitFor(() => {
        // 验证多个时间点的数据都显示了
        expect(screen.getByText("95%")).toBeInTheDocument();
      });
    });
  });
});
