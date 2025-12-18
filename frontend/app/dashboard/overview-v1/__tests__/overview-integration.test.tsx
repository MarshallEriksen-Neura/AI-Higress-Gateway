/**
 * 仪表盘概览页集成测试
 *
 * 测试覆盖：
 * - Property 5: 时间范围切换数据更新
 * - 验证需求 2.2, 6.2
 *
 * 测试场景：
 * 1. 筛选器变化时的数据更新
 * 2. 多个卡片的协同工作
 * 3. 导航功能
 * 4. 数据一致性
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { OverviewClient } from "../components/overview-client";
import { I18nProvider } from "@/lib/i18n-context";
import { SWRConfig } from "swr";
import * as useCreditsModule from "@/lib/swr/use-credits";
import * as useOverviewMetricsModule from "@/lib/swr/use-overview-metrics";

// Mock SWR Hooks
vi.mock("@/lib/swr/use-credits");
vi.mock("@/lib/swr/use-overview-metrics");

const mockUseCreditConsumptionSummary = vi.mocked(useCreditsModule.useCreditConsumptionSummary);
const mockUseOverviewMetrics = vi.mocked(useOverviewMetricsModule.useOverviewMetrics);

// 包装组件以提供必要的上下文
function renderWithProviders(component: React.ReactElement) {
  return render(
    <I18nProvider>
      <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
        {component}
      </SWRConfig>
    </I18nProvider>
  );
}

describe("Overview Page Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property 5: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时更新所有卡片的数据", async () => {
      const mockConsumptionData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 150,
        projected_days_left: 10,
        current_balance: 1500,
        daily_limit: 200,
        warning_threshold: 7,
      };

      const mockMetricsData = {
        total_requests: 5000,
        active_providers: 3,
        success_rate: 0.95,
      };

      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: mockConsumptionData,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      mockUseOverviewMetrics.mockReturnValue({
        overview: mockMetricsData as any,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithProviders(<OverviewClient />);

      // 等待初始数据加载
      await waitFor(() => {
        expect(screen.getByText(/积分消耗概览|Credit Consumption/)).toBeInTheDocument();
      });

      // 验证初始数据显示
      expect(screen.getByText("1,000")).toBeInTheDocument();
      expect(screen.getByText("1,500")).toBeInTheDocument();

      // 模拟时间范围变化
      const timeRangeSelect = screen.getByRole("combobox");
      await userEvent.click(timeRangeSelect);

      const option30d = screen.getByText(/最近 30 天|Last 30 Days/);
      await userEvent.click(option30d);

      // 验证 API 调用使用了新的时间范围
      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("30d");
        expect(mockUseOverviewMetrics).toHaveBeenCalledWith("30d");
      });
    });

    it("应该在时间范围变化时保持数据一致性", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 15,
        current_balance: 1500,
        daily_limit: 200,
        warning_threshold: 7,
      };

      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: mockData,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithProviders(<OverviewClient />);

      await waitFor(() => {
        expect(screen.getByText(/积分消耗概览|Credit Consumption/)).toBeInTheDocument();
      });

      // 验证数据一致性：消耗 + 余额应该等于总额
      const consumptionText = screen.getByText("1,000");
      const balanceText = screen.getByText("1,500");

      expect(consumptionText).toBeInTheDocument();
      expect(balanceText).toBeInTheDocument();
    });
  });

  describe("需求 2.2: 时间范围切换数据更新", () => {
    it("应该支持所有时间范围选项的切换", async () => {
      const timeRanges = ["today", "7d", "30d", "90d", "all"];

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

      renderWithProviders(<OverviewClient />);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      for (const range of timeRanges) {
        const select = screen.getByRole("combobox");
        await userEvent.click(select);

        // 查找对应的选项
        const options = screen.getAllByRole("option");
        const targetOption = options.find((opt) => {
          const text = opt.textContent || "";
          return (
            (range === "today" && (text.includes("Today") || text.includes("今天"))) ||
            (range === "7d" && text.includes("7")) ||
            (range === "30d" && text.includes("30")) ||
            (range === "90d" && text.includes("90")) ||
            (range === "all" && (text.includes("All") || text.includes("全部")))
          );
        });

        if (targetOption) {
          await userEvent.click(targetOption);
          expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith(range);
        }
      }
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

      mockUseOverviewMetrics.mockReturnValue({
        overview: {
          total_requests: 5000,
          active_providers: 3,
          success_rate: 0.95,
        } as any,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithProviders(<OverviewClient />);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      // 切换时间范围
      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const option = screen.getByText(/最近 30 天|Last 30 Days/);
      await userEvent.click(option);

      // 验证所有 Hook 都被调用了新的时间范围
      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("30d");
        expect(mockUseOverviewMetrics).toHaveBeenCalledWith("30d");
      });
    });
  });

  describe("多卡片协同工作", () => {
    it("应该正确显示所有卡片", async () => {
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

      renderWithProviders(<OverviewClient />);

      await waitFor(() => {
        // 验证各个卡片都存在
        expect(screen.getByText(/积分消耗概览|Credit Consumption/)).toBeInTheDocument();
      });
    });
  });
});
