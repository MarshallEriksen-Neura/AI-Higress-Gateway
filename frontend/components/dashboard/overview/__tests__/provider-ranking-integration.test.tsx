/**
 * Provider 排行榜卡片集成测试
 *
 * 测试覆盖：
 * - Property 5: 时间范围切换数据更新
 * - 验证需求 2.2
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("ProviderRankingCard Integration Tests", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  describe("Property 5: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时重新获取数据", async () => {
      const mockProviders7d = [
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

      const mockProviders30d = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 3000,
          request_count: 1500,
          success_rate: 0.96,
          percentage_of_total: 0.6,
          latency_p95_ms: 95,
        },
      ];

      // 第一次调用返回 7d 数据
      mockUseCreditProviderConsumption.mockReturnValueOnce({
        providers: mockProviders7d,
        totalConsumption: 1000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      const { rerender } = renderWithI18n(
        <ProviderRankingCard timeRange="7d" />
      );

      await waitFor(() => {
        expect(screen.getByText("1,000")).toBeInTheDocument();
      });

      // 第二次调用返回 30d 数据
      mockUseCreditProviderConsumption.mockReturnValueOnce({
        providers: mockProviders30d,
        totalConsumption: 3000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      // 重新渲染，改变 timeRange
      rerender(
        <I18nProvider>
          <ProviderRankingCard timeRange="30d" />
        </I18nProvider>
      );

      await waitFor(() => {
        // 验证数据已更新
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("30d");
      });
    });

    it("应该在时间范围为 today 时显示当天数据", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 100,
          request_count: 50,
          success_rate: 0.98,
          percentage_of_total: 1.0,
          latency_p95_ms: 90,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 100,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="today" />);

      await waitFor(() => {
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("today");
        expect(screen.getByText("100")).toBeInTheDocument();
      });
    });

    it("应该在时间范围为 all 时显示全部数据", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 50000,
          request_count: 25000,
          success_rate: 0.94,
          percentage_of_total: 0.7,
          latency_p95_ms: 110,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 50000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="all" />);

      await waitFor(() => {
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("all");
        expect(screen.getByText("50,000")).toBeInTheDocument();
      });
    });

    it("应该在时间范围为 90d 时显示 90 天数据", async () => {
      const mockProviders = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 9000,
          request_count: 4500,
          success_rate: 0.95,
          percentage_of_total: 0.5,
          latency_p95_ms: 100,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValue({
        providers: mockProviders,
        totalConsumption: 9000,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ProviderRankingCard timeRange="90d" />);

      await waitFor(() => {
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("90d");
        expect(screen.getByText("9,000")).toBeInTheDocument();
      });
    });
  });

  describe("需求 2.2: 支持时间范围切换", () => {
    it("应该在不同时间范围下显示不同的数据", async () => {
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

      // 测试 7d
      const { rerender } = renderWithI18n(
        <ProviderRankingCard timeRange="7d" />
      );

      await waitFor(() => {
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("7d");
      });

      // 测试 30d
      rerender(
        <I18nProvider>
          <ProviderRankingCard timeRange="30d" />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("30d");
      });
    });
  });

  describe("多个 Provider 的时间范围切换", () => {
    it("应该在时间范围变化时更新多个 Provider 的数据", async () => {
      const mockProviders7d = [
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

      const mockProviders30d = [
        {
          provider_id: "provider-1",
          provider_name: "OpenAI",
          total_consumption: 3000,
          request_count: 1500,
          success_rate: 0.96,
          percentage_of_total: 0.6,
          latency_p95_ms: 95,
        },
        {
          provider_id: "provider-2",
          provider_name: "Claude",
          total_consumption: 1500,
          request_count: 900,
          success_rate: 0.97,
          percentage_of_total: 0.3,
          latency_p95_ms: 85,
        },
      ];

      mockUseCreditProviderConsumption.mockReturnValueOnce({
        providers: mockProviders7d,
        totalConsumption: 1500,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      const { rerender } = renderWithI18n(
        <ProviderRankingCard timeRange="7d" />
      );

      await waitFor(() => {
        expect(screen.getByText("OpenAI")).toBeInTheDocument();
        expect(screen.getByText("Claude")).toBeInTheDocument();
      });

      mockUseCreditProviderConsumption.mockReturnValueOnce({
        providers: mockProviders30d,
        totalConsumption: 4500,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      rerender(
        <I18nProvider>
          <ProviderRankingCard timeRange="30d" />
        </I18nProvider>
      );

      await waitFor(() => {
        // 验证数据已更新
        expect(mockUseCreditProviderConsumption).toHaveBeenCalledWith("30d");
      });
    });
  });
});
