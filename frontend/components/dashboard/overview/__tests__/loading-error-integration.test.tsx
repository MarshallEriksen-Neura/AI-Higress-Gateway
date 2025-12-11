/**
 * 加载态和错误处理集成测试
 *
 * 测试覆盖：
 * - 卡片在加载状态下显示 Skeleton
 * - 卡片在错误状态下显示错误提示
 * - 卡片在无数据状态下显示空数据提示
 * - 重试功能正常工作
 * - 验证需求 7.4
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConsumptionSummaryCard } from "../consumption-summary-card";
import { ProviderRankingCard } from "../provider-ranking-card";
import { I18nProvider } from "@/lib/i18n-context";
import { SWRConfig } from "swr";

// Mock SWR hooks
vi.mock("@/lib/swr/use-credits", () => ({
  useCreditConsumptionSummary: vi.fn(),
  useCreditProviderConsumption: vi.fn(),
}));

vi.mock("@/lib/swr/use-overview-metrics", () => ({
  useSuccessRateTrend: vi.fn(),
  useActiveModels: vi.fn(),
  useOverviewEvents: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: vi.fn(),
  })),
}));

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

describe("Loading and Error Handling Integration", () => {
  describe("加载态处理", () => {
    it("应该在加载时显示 Skeleton 占位符", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      useCreditConsumptionSummary.mockReturnValue({
        consumption: null,
        loading: true,
        error: null,
        refresh: vi.fn(),
      });

      const { container } = renderWithProviders(
        <ConsumptionSummaryCard timeRange="7d" />
      );

      await waitFor(() => {
        const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在加载完成后显示实际数据", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      useCreditConsumptionSummary.mockReturnValue({
        consumption: {
          total_consumption: 100,
          daily_average: 10,
          current_balance: 500,
          projected_days_left: 50,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      renderWithProviders(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/100/)).toBeInTheDocument();
        expect(screen.getByText(/500/)).toBeInTheDocument();
      });
    });
  });

  describe("错误处理", () => {
    it("应该在错误时显示错误提示", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      useCreditConsumptionSummary.mockReturnValue({
        consumption: null,
        loading: false,
        error: new Error("Failed to load"),
        refresh: vi.fn(),
      });

      renderWithProviders(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/加载失败|Failed/)).toBeInTheDocument();
      });
    });

    it("应该在错误时提供重试按钮", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      const mockRefresh = vi.fn();
      useCreditConsumptionSummary.mockReturnValue({
        consumption: null,
        loading: false,
        error: new Error("Failed to load"),
        refresh: mockRefresh,
      });

      renderWithProviders(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|Retry/);
        expect(retryButton).toBeInTheDocument();

        fireEvent.click(retryButton);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("应该在有缓存数据时显示缓存数据而不是错误", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      useCreditConsumptionSummary.mockReturnValue({
        consumption: {
          total_consumption: 100,
          daily_average: 10,
          current_balance: 500,
          projected_days_left: 50,
          warning_threshold: 7,
        },
        loading: false,
        error: new Error("Failed to load"),
        refresh: vi.fn(),
      });

      renderWithProviders(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 应该显示缓存的数据而不是错误
        expect(screen.getByText(/100/)).toBeInTheDocument();
      });
    });
  });

  describe("空数据处理", () => {
    it("应该在没有数据时显示空数据提示", async () => {
      const { useCreditProviderConsumption } = require("@/lib/swr/use-credits");
      useCreditProviderConsumption.mockReturnValue({
        providers: [],
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      renderWithProviders(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/暂无|No data/)).toBeInTheDocument();
      });
    });
  });

  describe("需求 7.4: 加载态和错误处理", () => {
    it("应该在加载时显示 Skeleton 占位符，避免布局抖动", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      useCreditConsumptionSummary.mockReturnValue({
        consumption: null,
        loading: true,
        error: null,
        refresh: vi.fn(),
      });

      const { container } = renderWithProviders(
        <ConsumptionSummaryCard timeRange="7d" />
      );

      await waitFor(() => {
        // 检查是否存在卡片结构
        const card = container.querySelector('[data-slot="card"]');
        expect(card).toBeInTheDocument();

        // 检查是否有 Skeleton 占位符
        const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在错误时显示错误提示并提供重试功能", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      const mockRefresh = vi.fn();
      useCreditConsumptionSummary.mockReturnValue({
        consumption: null,
        loading: false,
        error: new Error("Failed to load"),
        refresh: mockRefresh,
      });

      renderWithProviders(<ConsumptionSummaryCard timeRange="7d" />);

      await waitFor(() => {
        // 检查错误提示
        expect(screen.getByText(/加载失败|Failed/)).toBeInTheDocument();

        // 检查重试按钮
        const retryButton = screen.getByText(/重试|Retry/);
        expect(retryButton).toBeInTheDocument();

        // 点击重试
        fireEvent.click(retryButton);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("应该在没有数据时显示友好的空数据提示", async () => {
      const { useCreditProviderConsumption } = require("@/lib/swr/use-credits");
      useCreditProviderConsumption.mockReturnValue({
        providers: [],
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      renderWithProviders(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText(/暂无|No data/)).toBeInTheDocument();
      });
    });

    it("应该正确处理加载 -> 成功 -> 加载 -> 错误的状态转换", async () => {
      const { useCreditConsumptionSummary } = require("@/lib/swr/use-credits");
      const mockRefresh = vi.fn();

      // 初始加载状态
      useCreditConsumptionSummary.mockReturnValue({
        consumption: null,
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      const { rerender, container } = renderWithProviders(
        <ConsumptionSummaryCard timeRange="7d" />
      );

      await waitFor(() => {
        const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
      });

      // 成功状态
      useCreditConsumptionSummary.mockReturnValue({
        consumption: {
          total_consumption: 100,
          daily_average: 10,
          current_balance: 500,
          projected_days_left: 50,
          warning_threshold: 7,
        },
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      rerender(
        <I18nProvider>
          <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
            <ConsumptionSummaryCard timeRange="7d" />
          </SWRConfig>
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/100/)).toBeInTheDocument();
      });

      // 再次加载状态
      useCreditConsumptionSummary.mockReturnValue({
        consumption: {
          total_consumption: 100,
          daily_average: 10,
          current_balance: 500,
          projected_days_left: 50,
          warning_threshold: 7,
        },
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      rerender(
        <I18nProvider>
          <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
            <ConsumptionSummaryCard timeRange="7d" />
          </SWRConfig>
        </I18nProvider>
      );

      // 错误状态
      useCreditConsumptionSummary.mockReturnValue({
        consumption: {
          total_consumption: 100,
          daily_average: 10,
          current_balance: 500,
          projected_days_left: 50,
          warning_threshold: 7,
        },
        loading: false,
        error: new Error("Failed to load"),
        refresh: mockRefresh,
      });

      rerender(
        <I18nProvider>
          <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
            <ConsumptionSummaryCard timeRange="7d" />
          </SWRConfig>
        </I18nProvider>
      );

      await waitFor(() => {
        // 应该显示缓存的数据而不是错误
        expect(screen.getByText(/100/)).toBeInTheDocument();
      });
    });
  });
});
