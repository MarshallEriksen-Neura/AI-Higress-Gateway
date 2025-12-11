/**
 * 积分消耗概览卡片单元测试
 *
 * 测试覆盖：
 * - Property 1: 消耗概览卡片完整性
 * - Property 2: 预计可用天数计算正确性
 * - Property 3: 预警标签触发条件
 * - 验证需求 1.1, 1.2, 1.3, 1.4
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConsumptionSummaryCard } from "../consumption-summary-card";
import { I18nProvider } from "@/lib/i18n-context";
import * as useCreditsModule from "@/lib/swr/use-credits";

// Mock SWR Hook
vi.mock("@/lib/swr/use-credits");

const mockUseCreditConsumptionSummary = vi.mocked(useCreditsModule.useCreditConsumptionSummary);

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("ConsumptionSummaryCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property 1: 消耗概览卡片完整性", () => {
    it("应该显示本期消耗、余额、预算和 Sparkline 趋势图", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 150,
        projected_days_left: 10,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证卡片标题
        expect(screen.getByText(/积分消耗概览|Credit Consumption Overview/)).toBeInTheDocument();

        // 验证所有指标都显示
        expect(screen.getByText(/本期消耗|Current Consumption/)).toBeInTheDocument();
        expect(screen.getByText(/日均消耗|Daily Average/)).toBeInTheDocument();
        expect(screen.getByText(/余额|Balance/)).toBeInTheDocument();
        expect(screen.getByText(/预计可用天数|Projected Days Left/)).toBeInTheDocument();

        // 验证数值显示
        expect(screen.getByText("1,000")).toBeInTheDocument();
        expect(screen.getByText("150")).toBeInTheDocument();
        expect(screen.getByText("1,500")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();

        // 验证趋势图标题
        expect(screen.getByText(/消耗趋势|Consumption Trend/)).toBeInTheDocument();
      });
    });

    it("应该在加载时显示 Skeleton 占位符", async () => {
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: undefined,
        loading: true,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证 Skeleton 元素存在
        const skeletons = screen.getAllByTestId("skeleton");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在错误时显示错误提示", async () => {
      const mockError = new Error("Failed to load data");
      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: undefined,
        loading: false,
        error: mockError,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/消耗数据加载失败|Failed to load consumption data/)).toBeInTheDocument();
        expect(screen.getByText(/重试|Retry/)).toBeInTheDocument();
      });
    });
  });

  describe("Property 2: 预计可用天数计算正确性", () => {
    it("应该正确计算预计可用天数", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 15, // 1500 / 100 = 15
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("15")).toBeInTheDocument();
      });
    });

    it("应该在日均消耗为 0 时显示无限", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 0,
        daily_average: 0,
        projected_days_left: -1, // 表示无限
        current_balance: 5000,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/无限|Unlimited/)).toBeInTheDocument();
      });
    });

    it("应该在预计可用天数为 0 时显示 0", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 0,
        current_balance: 0,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
      });
    });
  });

  describe("Property 3: 预警标签触发条件", () => {
    it("应该在预计可用天数 < 预设阈值时显示预警标签", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 5, // < 7 (threshold)
        current_balance: 500,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证预警标签显示
        expect(screen.getByText(/余额不足|Low Balance/)).toBeInTheDocument();
        // 验证预警信息显示
        expect(screen.getByText(/仅剩 5 天|Only 5 days left/)).toBeInTheDocument();
      });
    });

    it("应该在预计可用天数 >= 预设阈值时不显示预警标签", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 10, // >= 7 (threshold)
        current_balance: 1000,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证预警标签不显示
        expect(screen.queryByText(/余额不足|Low Balance/)).not.toBeInTheDocument();
      });
    });

    it("应该在预计可用天数为负数时不显示预警标签", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 0,
        daily_average: 0,
        projected_days_left: -1, // 无限
        current_balance: 5000,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证预警标签不显示
        expect(screen.queryByText(/余额不足|Low Balance/)).not.toBeInTheDocument();
      });
    });

    it("应该在边界情况（预计可用天数 = 阈值）时不显示预警标签", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 7, // = 7 (threshold)
        current_balance: 700,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证预警标签不显示（因为 7 不小于 7）
        expect(screen.queryByText(/余额不足|Low Balance/)).not.toBeInTheDocument();
      });
    });
  });

  describe("需求 1.1: 显示本期消耗、余额、预算信息", () => {
    it("应该显示所有必需的信息", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 150,
        projected_days_left: 10,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证本期消耗
        expect(screen.getByText("1,000")).toBeInTheDocument();
        // 验证余额
        expect(screen.getByText("1,500")).toBeInTheDocument();
        // 验证日均消耗
        expect(screen.getByText("150")).toBeInTheDocument();
      });
    });
  });

  describe("需求 1.2: 集成 Sparkline 趋势图", () => {
    it("应该显示趋势图", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 150,
        projected_days_left: 10,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 验证趋势图容器存在
        expect(screen.getByText(/消耗趋势|Consumption Trend/)).toBeInTheDocument();
      });
    });
  });

  describe("需求 1.3: 计算预计可用天数", () => {
    it("应该正确计算并显示预计可用天数", async () => {
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("15")).toBeInTheDocument();
      });
    });
  });

  describe("需求 1.4: 预警标签逻辑", () => {
    it("应该在余额不足时显示预警标签", async () => {
      const mockData = {
        time_range: "7d",
        total_consumption: 1000,
        daily_average: 100,
        projected_days_left: 3,
        current_balance: 300,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/余额不足|Low Balance/)).toBeInTheDocument();
      });
    });
  });

  describe("时间范围参数", () => {
    it("应该根据传入的 timeRange 参数获取数据", async () => {
      const mockData = {
        time_range: "30d",
        total_consumption: 3000,
        daily_average: 100,
        projected_days_left: 30,
        current_balance: 3000,
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

      renderWithI18n(<ConsumptionSummaryCard timeRange="30d" />);

      await waitFor(() => {
        expect(mockUseCreditConsumptionSummary).toHaveBeenCalledWith("30d");
      });
    });
  });

  describe("重试功能", () => {
    it("应该在点击重试按钮时调用 refresh", async () => {
      const mockRefresh = vi.fn();
      const mockError = new Error("Failed to load data");

      mockUseCreditConsumptionSummary.mockReturnValue({
        consumption: undefined,
        loading: false,
        error: mockError,
        validating: false,
        refresh: mockRefresh,
      });

      renderWithI18n(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|Retry/);
        retryButton.click();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });
});
