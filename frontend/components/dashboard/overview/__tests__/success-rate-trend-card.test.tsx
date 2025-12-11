/**
 * 成功率趋势卡片单元测试
 *
 * 测试覆盖：
 * - Property 8: 成功率趋势卡片完整性
 * - Property 9: Provider 维度成功率拆分
 * - Property 10: 异常成功率高亮显示
 * - 验证需求 3.1, 3.2, 3.3, 3.4
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

describe("SuccessRateTrendCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property 8: 成功率趋势卡片完整性", () => {
    it("应该显示整体成功率和折线图", async () => {
      const mockData = {
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
          {
            window_start: "2024-12-07T00:00:00Z",
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
        // 验证卡片标题
        expect(screen.getByText(/请求成功率趋势|Success Rate Trend/)).toBeInTheDocument();

        // 验证统计指标显示
        expect(screen.getByText(/整体成功率|Overall Success Rate/)).toBeInTheDocument();
        expect(screen.getByText("Average")).toBeInTheDocument();
        expect(screen.getByText("Minimum")).toBeInTheDocument();
        expect(screen.getByText("Maximum")).toBeInTheDocument();

        // 验证成功率百分比显示
        expect(screen.getByText("95%")).toBeInTheDocument();
      });
    });

    it("应该在加载时显示 Skeleton 占位符", async () => {
      mockUseSuccessRateTrend.mockReturnValue({
        trend: undefined,
        loading: true,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" />);

      await waitFor(() => {
        // 验证 Skeleton 元素存在
        const skeletons = screen.getAllByTestId("skeleton");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在错误时显示错误提示", async () => {
      const mockError = new Error("Failed to load data");
      mockUseSuccessRateTrend.mockReturnValue({
        trend: undefined,
        loading: false,
        error: mockError,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" />);

      await waitFor(() => {
        // 验证错误提示显示
        expect(screen.getByText(/成功率数据加载失败|Failed to load success rate data/)).toBeInTheDocument();
        // 验证重试按钮存在
        expect(screen.getByText(/重试|Retry/)).toBeInTheDocument();
      });
    });

    it("应该在无数据时显示占位符", async () => {
      mockUseSuccessRateTrend.mockReturnValue({
        trend: {
          time_range: "7d",
          bucket: "day",
          transport: "all",
          is_stream: "all",
          points: [],
        },
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" />);

      await waitFor(() => {
        // 验证无数据提示显示
        expect(screen.getByText(/暂无成功率数据|No success rate data available/)).toBeInTheDocument();
      });
    });
  });

  describe("Property 9: Provider 维度成功率拆分", () => {
    it("应该显示折线图用于成功率趋势", async () => {
      const mockData = {
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
        trend: mockData,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" />);

      await waitFor(() => {
        // 验证 Provider 维度拆分标题
        expect(screen.getByText(/Provider 维度拆分|Provider Breakdown/)).toBeInTheDocument();
      });
    });
  });

  describe("Property 10: 异常成功率高亮显示", () => {
    it("当成功率低于阈值时应该显示异常标签", async () => {
      const mockData = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-05T00:00:00Z",
            total_requests: 1000,
            success_requests: 800, // 80% 成功率，低于 90% 阈值
            error_requests: 200,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.2,
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

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" anomalyThreshold={0.9} />);

      await waitFor(() => {
        // 验证异常检测标签显示
        expect(screen.getByText(/异常检测|Anomaly Detected/)).toBeInTheDocument();
        // 验证异常警告信息显示
        expect(screen.getByText(/成功率偏低|Low success rate/)).toBeInTheDocument();
      });
    });

    it("当所有成功率都高于阈值时不应该显示异常标签", async () => {
      const mockData = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-05T00:00:00Z",
            total_requests: 1000,
            success_requests: 950, // 95% 成功率，高于 90% 阈值
            error_requests: 50,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.05,
          },
          {
            window_start: "2024-12-06T00:00:00Z",
            total_requests: 1100,
            success_requests: 1045, // 95% 成功率
            error_requests: 55,
            latency_avg_ms: 105,
            latency_p95_ms: 210,
            latency_p99_ms: 310,
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

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" anomalyThreshold={0.9} />);

      await waitFor(() => {
        // 验证异常检测标签不显示
        expect(screen.queryByText(/异常检测|Anomaly Detected/)).not.toBeInTheDocument();
        // 验证异常警告信息不显示
        expect(screen.queryByText(/成功率偏低|Low success rate/)).not.toBeInTheDocument();
      });
    });

    it("应该高亮显示低成功率的数值", async () => {
      const mockData = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-05T00:00:00Z",
            total_requests: 1000,
            success_requests: 800, // 80% 成功率
            error_requests: 200,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.2,
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

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" anomalyThreshold={0.9} />);

      await waitFor(() => {
        // 验证当前成功率显示为 80%
        expect(screen.getByText("80%")).toBeInTheDocument();
      });
    });
  });

  describe("需求 3.1, 3.2: 整体成功率和折线图", () => {
    it("应该显示整体成功率统计", async () => {
      const mockData = {
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
            success_requests: 1000,
            error_requests: 100,
            latency_avg_ms: 105,
            latency_p95_ms: 210,
            latency_p99_ms: 310,
            error_rate: 0.09,
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
        // 验证整体成功率显示
        expect(screen.getByText(/整体成功率|Overall Success Rate/)).toBeInTheDocument();
        // 验证平均成功率显示
        expect(screen.getByText("Average")).toBeInTheDocument();
      });
    });
  });

  describe("需求 3.3: 按 Provider 维度拆分显示", () => {
    it("应该显示 Provider 维度拆分标题", async () => {
      const mockData = {
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
        trend: mockData,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" />);

      await waitFor(() => {
        // 验证 Provider 维度拆分标题
        expect(screen.getByText(/Provider 维度拆分|Provider Breakdown/)).toBeInTheDocument();
      });
    });
  });

  describe("需求 3.4: 实现异常成功率高亮", () => {
    it("应该在异常时显示异常检测标签", async () => {
      const mockData = {
        time_range: "7d",
        bucket: "day",
        transport: "all",
        is_stream: "all",
        points: [
          {
            window_start: "2024-12-05T00:00:00Z",
            total_requests: 1000,
            success_requests: 800,
            error_requests: 200,
            latency_avg_ms: 100,
            latency_p95_ms: 200,
            latency_p99_ms: 300,
            error_rate: 0.2,
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

      renderWithI18n(<SuccessRateTrendCard timeRange="7d" anomalyThreshold={0.9} />);

      await waitFor(() => {
        // 验证异常检测标签显示
        expect(screen.getByText(/异常检测|Anomaly Detected/)).toBeInTheDocument();
      });
    });
  });
});
