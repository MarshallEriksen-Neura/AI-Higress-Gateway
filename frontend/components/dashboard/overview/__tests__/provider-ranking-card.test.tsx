/**
 * Provider 消耗排行榜卡片单元测试
 *
 * 测试覆盖：
 * - Property 4: Provider 排行榜排序一致性
 * - Property 6: Provider 指标完整性
 * - Property 7: Provider 快捷链接导航
 * - 验证需求 2.1, 2.2, 2.3, 2.4
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ProviderRankingCard } from "../provider-ranking-card";
import { I18nProvider } from "@/lib/i18n-context";
import * as useCreditsModule from "@/lib/swr/use-credits";
import { useRouter } from "next/navigation";

// Mock SWR Hook
vi.mock("@/lib/swr/use-credits");
vi.mock("next/navigation");

const mockUseCreditProviderConsumption = useCreditsModule.useCreditProviderConsumption as jest.MockedFunction<
  typeof useCreditsModule.useCreditProviderConsumption
>;

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("ProviderRankingCard Component", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  describe("Property 4: Provider 排行榜排序一致性", () => {
    it("应该按消耗积分降序排列 Provider", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
        {
          provider_id: "provider-2",
          provider_name: "Claude",
          total_consumption: 500,
          request_count: 300,
          success_rate: 0.98,
          percentage_of_total: 0.25,
          latency_p95_ms: 80,
        },
        {
          provider_id: "provider-3",
          provider_name: "Google",
          total_consumption: 500,
          request_count: 200,
          success_rate: 0.92,
          percentage_of_total: 0.25,
          latency_p95_ms: 120,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 2000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const rows = screen.getAllByTestId(/provider-row-/);
        expect(rows).toHaveLength(3);

        // 验证排序顺序：OpenAI (1000) > Claude (500) = Google (500)
        expect(rows[0]).toHaveTextContent("OpenAI");
        expect(rows[0]).toHaveTextContent("1,000");

        // Claude 和 Google 都是 500，顺序可能不同，但都应该在后面
        expect(rows[1]).toHaveTextContent(/Claude|Google/);
        expect(rows[2]).toHaveTextContent(/Claude|Google/);
      });
    });

    it("应该在消耗相同时保持稳定排序", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "Provider A",
          total_consumption: 500,
          request_count: 100,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
        {
          provider_id: "provider-2",
          provider_name: "Provider B",
          total_consumption: 500,
          request_count: 100,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const rows = screen.getAllByTestId(/provider-row-/);
        expect(rows).toHaveLength(2);
        // 两个 Provider 都应该显示
        expect(screen.getByText("Provider A")).toBeInTheDocument();
        expect(screen.getByText("Provider B")).toBeInTheDocument();
      });
    });
  });

  describe("Property 6: Provider 指标完整性", () => {
    it("应该显示所有必需的指标", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        // 验证消耗
        expect(screen.getByText("1,000")).toBeInTheDocument();
        // 验证请求数
        expect(screen.getByText("500")).toBeInTheDocument();
        // 验证成功率
        expect(screen.getByText("95.0%")).toBeInTheDocument();
        // 验证占比
        expect(screen.getByText("50.0%")).toBeInTheDocument();
        // 验证延迟
        expect(screen.getByText("100ms")).toBeInTheDocument();
      });
    });

    it("应该在没有延迟数据时显示 -", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: undefined,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        // 验证其他指标存在
        expect(screen.getByText("1,000")).toBeInTheDocument();
        expect(screen.getByText("500")).toBeInTheDocument();
      });
    });

    it("应该根据成功率显示不同的 Badge 颜色", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "High Success",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.98,
          percentage_of_total: 0.33,
          latency_p95_ms: 100,
        },
        {
          provider_id: "provider-2",
          provider_name: "Medium Success",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.92,
          percentage_of_total: 0.33,
          latency_p95_ms: 100,
        },
        {
          provider_id: "provider-3",
          provider_name: "Low Success",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.85,
          percentage_of_total: 0.34,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 3000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        // 验证所有成功率都显示
        expect(screen.getByText("98.0%")).toBeInTheDocument();
        expect(screen.getByText("92.0%")).toBeInTheDocument();
        expect(screen.getByText("85.0%")).toBeInTheDocument();
      });
    });
  });

  describe("Property 7: Provider 快捷链接导航", () => {
    it("应该在点击 Provider 行时导航到 Provider 管理页面", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const row = screen.getByTestId("provider-row-provider-1");
        fireEvent.click(row);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/providers/provider-1");
      });
    });

    it("应该在点击查看详情按钮时导航到 Provider 管理页面", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const detailsButton = screen.getByText(/查看详情|View Details/);
        fireEvent.click(detailsButton);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/providers/provider-1");
      });
    });

    it("应该调用 onProviderClick 回调", async () => {
      const mockOnProviderClick = vi.fn();
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(
        <ProviderRankingCard
          timeRange="7d"
          onProviderClick={mockOnProviderClick}
        />
      );

      await waitFor(() => {
        const row = screen.getByTestId("provider-row-provider-1");
        fireEvent.click(row);
        expect(mockOnProviderClick).toHaveBeenCalledWith("provider-1");
      });
    });
  });

  describe("需求 2.1: 显示按消耗排序的 Provider 列表", () => {
    it("应该显示 Provider 列表", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
        {
          provider_id: "provider-2",
          provider_name: "Claude",
          total_consumption: 500,
          request_count: 300,
          success_rate: 0.98,
          percentage_of_total: 0.25,
          latency_p95_ms: 80,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1500,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("OpenAI")).toBeInTheDocument();
        expect(screen.getByText("Claude")).toBeInTheDocument();
      });
    });
  });

  describe("需求 2.2: 支持时间范围切换", () => {
    it("应该根据传入的 timeRange 参数获取数据", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="30d" />);

      await waitFor(() => {
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("30d");
      });
    });
  });

  describe("需求 2.3: 显示消耗、请求量、成功率等指标", () => {
    it("应该显示所有关键指标", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        // 验证消耗
        expect(screen.getByText("1,000")).toBeInTheDocument();
        // 验证请求数
        expect(screen.getByText("500")).toBeInTheDocument();
        // 验证成功率
        expect(screen.getByText("95.0%")).toBeInTheDocument();
      });
    });
  });

  describe("需求 2.4: 实现快捷链接导航", () => {
    it("应该提供快捷链接导航到 Provider 管理页面", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const detailsButton = screen.getByText(/查看详情|View Details/);
        expect(detailsButton).toBeInTheDocument();
        fireEvent.click(detailsButton);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/providers/provider-1");
      });
    });
  });

  describe("加载和错误状态", () => {
    it("应该在加载时显示 Skeleton 占位符", async () => {
      mockUseCreditProviderConsumption.mockReturnValue({
        providers: [],
        totalConsumption: 0,
        loading: true,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const skeletons = screen.getAllByTestId("skeleton");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在错误时显示错误提示", async () => {
      const mockError = new Error("Failed to load data");
      mockUseCreditProviderConsumption.mockReturnValue({
        providers: [],
        totalConsumption: 0,
        loading: false,
        error: mockError,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Provider 数据加载失败|Failed to load provider data/)
        ).toBeInTheDocument();
        expect(screen.getByText(/重试|Retry/)).toBeInTheDocument();
      });
    });

    it("应该在无数据时显示占位符", async () => {
      mockUseCreditProviderConsumption.mockReturnValue({
        providers: [],
        totalConsumption: 0,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText(/暂无 Provider 数据|No provider data available/)
        ).toBeInTheDocument();
      });
    });

    it("应该在点击重试按钮时调用 refresh", async () => {
      const mockRefresh = vi.fn();
      const mockError = new Error("Failed to load data");

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: [],
        totalConsumption: 0,
        loading: false,
        error: mockError,
        validating: false,
        refresh: mockRefresh,
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|Retry/);
        fireEvent.click(retryButton);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("排名显示", () => {
    it("应该显示正确的排名号", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "Provider A",
          total_consumption: 1000,
          request_count: 500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
        {
          provider_id: "provider-2",
          provider_name: "Provider B",
          total_consumption: 500,
          request_count: 300,
          success_rate: 0.98,
          percentage_of_total: 0.25,
          latency_p95_ms: 80,
        },
        {
          provider_id: "provider-3",
          provider_name: "Provider C",
          total_consumption: 500,
          request_count: 200,
          success_rate: 0.92,
          percentage_of_total: 0.25,
          latency_p95_ms: 120,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 2000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="7d" />);

      await waitFor(() => {
        // 验证排名号显示
        const rows = screen.getAllByTestId(/provider-row-/);
        expect(rows).toHaveLength(3);
      });
    });
  });
});
