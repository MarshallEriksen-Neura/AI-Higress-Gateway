/**
 * 积分消耗卡片集成测试
 *
 * 测试覆盖：
 * - Property 5: 时间范围切换数据更新
 * - 验证需求 2.2, 6.2
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewClient } from "@/app/dashboard/overview/components/overview-client";
import { I18nProvider } from "@/lib/i18n-context";
import * as useCreditsModule from "@/lib/swr/use-credits";
import * as useOverviewMetricsModule from "@/lib/swr/use-overview-metrics";

// Mock SWR Hooks
vi.mock("@/lib/swr/use-credits");
vi.mock("@/lib/swr/use-overview-metrics");

const mockUseCreditConsumptionSummary = useCreditsModule.useCreditConsumptionSummary as jest.MockedFunction<
  typeof useCreditsModule.useCreditConsumptionSummary
>;

const mockUseOverviewMetrics = useOverviewMetricsModule.useOverviewMetrics as jest.MockedFunction<
  typeof useOverviewMetricsModule.useOverviewMetrics
>;

const mockUseActiveProvidersOverview = useOverviewMetricsModule.useActiveProvidersOverview as jest.MockedFunction<
  typeof useOverviewMetricsModule.useActiveProvidersOverview
>;

const mockUseOverviewActivity = useOverviewMetricsModule.useOverviewActivity as jest.MockedFunction<
  typeof useOverviewMetricsModule.useOverviewActivity
>;

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("Consumption Card Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 设置默认的 mock 返回值
    mockUseOverviewMetrics.mockReturnValue({
      overview: {
        time_range: "7d",
        transport: "all",
        is_stream: "all",
        total_requests: 10000,
        success_requests: 9800,
        error_requests: 200,
        success_rate: 0.98,
        total_requests_prev: 9000,
        success_requests_prev: 8820,
        error_requests_prev: 180,
        success_rate_prev: 0.98,
        active_providers: 5,
        active_providers_prev: 4,
      },
      error: null,
      loading: false,
      validating: false,
      refresh: vi.fn(),
    });

    mockUseActiveProvidersOverview.mockReturnValue({
      data: {
        time_range: "7d",
        transport: "all",
        is_stream: "all",
        items: [],
      },
      error: null,
      loading: false,
      validating: false,
      refresh: vi.fn(),
    });

    mockUseOverviewActivity.mockReturnValue({
      activity: {
        time_range: "7d",
        bucket: "minute",
        transport: "all",
        is_stream: "all",
        points: [],
      },
      error: null,
      loading: false,
      validating: false,
      refresh: vi.fn(),
    });
  });

  describe("Property 5: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时更新所有卡片的数据", async () => {
      // 初始化为 7d
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: {
          time_range: "7d",
          total_consumption: 1000,
          daily_average: 150,
          projected_days_left: 10,
          current_balance: 1500,
          daily_limit: 200,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<OverviewClient />);

      await waitFor(() => {
        expect(screen.getByText("1,000")).toBeInTheDocument();
      });

      // 切换到 30d
      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const option30d = screen.getByText(/最近 30 天|Last 30 Days/);
      await userEvent.click(option30d);

      // 更新 mock 返回值以模拟 30d 数据
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: {
          time_range: "30d",
          total_consumption: 4000,
          daily_average: 133,
          projected_days_left: 30,
          current_balance: 4000,
          daily_limit: 200,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      // 验证数据已更新
      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("30d");
      });
    });

    it("应该在时间范围变化时使用新的时间范围参数调用 API", async () => {
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: {
          time_range: "7d",
          total_consumption: 1000,
          daily_average: 150,
          projected_days_left: 10,
          current_balance: 1500,
          daily_limit: 200,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<OverviewClient />);

      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("7d");
      });

      // 切换到 all
      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const optionAll = screen.getByText(/全部时间|All Time/);
      await userEvent.click(optionAll);

      // 验证使用了新的时间范围参数
      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("all");
      });
    });
  });

  describe("需求 2.2: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时更新消耗卡片的数据", async () => {
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: {
          time_range: "7d",
          total_consumption: 1000,
          daily_average: 150,
          projected_days_left: 10,
          current_balance: 1500,
          daily_limit: 200,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<OverviewClient />);

      await waitFor(() => {
        expect(screen.getByText("1,000")).toBeInTheDocument();
      });

      // 切换时间范围
      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const option30d = screen.getByText(/最近 30 天|Last 30 Days/);
      await userEvent.click(option30d);

      // 验证 Hook 被调用了新的时间范围
      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("30d");
      });
    });
  });

  describe("需求 6.2: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时更新所有卡片", async () => {
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: {
          time_range: "7d",
          total_consumption: 1000,
          daily_average: 150,
          projected_days_left: 10,
          current_balance: 1500,
          daily_limit: 200,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<OverviewClient />);

      await waitFor(() => {
        expect(screen.getByText("1,000")).toBeInTheDocument();
      });

      // 切换时间范围
      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const option30d = screen.getByText(/最近 30 天|Last 30 Days/);
      await userEvent.click(option30d);

      // 验证所有 Hook 都被调用了新的时间范围
      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("30d");
        expect(mockUseOverviewMetrics).toHaveBeenCalledWith(
          expect.objectContaining({ time_range: "30d" })
        );
      });
    });
  });
});
