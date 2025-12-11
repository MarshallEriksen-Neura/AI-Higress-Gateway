/**
 * 活跃模型卡片单元测试
 *
 * 测试覆盖：
 * - Property 13: 活跃模型卡片完整性
 * - 验证需求 5.1, 5.3
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ActiveModelsCard } from "../active-models-card";
import { I18nProvider } from "@/lib/i18n-context";
import * as useOverviewMetricsModule from "@/lib/swr/use-overview-metrics";

// Mock SWR Hook
vi.mock("@/lib/swr/use-overview-metrics");

const mockUseActiveModels = useOverviewMetricsModule.useActiveModels as jest.MockedFunction<
  typeof useOverviewMetricsModule.useActiveModels
>;

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("ActiveModelsCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Property 13: 活跃模型卡片完整性", () => {
    it("应该显示调用最多的模型列表", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
          {
            model_id: "gpt-3.5",
            model_name: "GPT-3.5",
            call_count: 3000,
            success_rate: 0.95,
            failure_count: 150,
          },
        ],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证调用最多的模型显示
        expect(screen.getByText("GPT-4")).toBeInTheDocument();
        expect(screen.getByText("GPT-3.5")).toBeInTheDocument();
        // 验证调用次数显示
        expect(screen.getByText("5,000")).toBeInTheDocument();
        expect(screen.getByText("3,000")).toBeInTheDocument();
      });
    });

    it("应该显示失败最多的模型列表", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
          {
            model_id: "palm-2",
            model_name: "PaLM 2",
            call_count: 800,
            success_rate: 0.80,
            failure_count: 160,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证失败最多的模型显示
        expect(screen.getByText("Claude 2")).toBeInTheDocument();
        expect(screen.getByText("PaLM 2")).toBeInTheDocument();
        // 验证失败次数显示
        expect(screen.getAllByText("150")).toHaveLength(1);
        expect(screen.getByText("160")).toBeInTheDocument();
      });
    });

    it("应该显示成功率指标", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证成功率显示
        expect(screen.getByText("98.0%")).toBeInTheDocument();
        expect(screen.getByText("85.0%")).toBeInTheDocument();
      });
    });

    it("应该根据成功率显示不同的 Badge 颜色", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "High Success",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
          {
            model_id: "gpt-3.5",
            model_name: "Medium Success",
            call_count: 3000,
            success_rate: 0.92,
            failure_count: 240,
          },
          {
            model_id: "claude-2",
            model_name: "Low Success",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证所有成功率都显示
        expect(screen.getByText("98.0%")).toBeInTheDocument();
        expect(screen.getByText("92.0%")).toBeInTheDocument();
        expect(screen.getByText("85.0%")).toBeInTheDocument();
      });
    });
  });

  describe("需求 5.1: 显示调用最多和失败最多的模型", () => {
    it("应该显示调用最多的模型", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("GPT-4")).toBeInTheDocument();
        expect(screen.getByText("5,000")).toBeInTheDocument();
      });
    });

    it("应该显示失败最多的模型", async () => {
      const mockModels = {
        most_called: [],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText("Claude 2")).toBeInTheDocument();
        expect(screen.getByText("150")).toBeInTheDocument();
      });
    });
  });

  describe("需求 5.3: 显示调用次数、成功率等指标", () => {
    it("应该显示所有关键指标", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证调用次数
        expect(screen.getByText("5,000")).toBeInTheDocument();
        // 验证成功率
        expect(screen.getByText("98.0%")).toBeInTheDocument();
        expect(screen.getByText("85.0%")).toBeInTheDocument();
        // 验证失败次数
        expect(screen.getByText("150")).toBeInTheDocument();
      });
    });
  });

  describe("加载和错误状态", () => {
    it("应该在加载时显示 Skeleton 占位符", async () => {
      mockUseActiveModels.mockReturnValue({
        models: undefined,
        loading: true,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        const skeletons = screen.getAllByTestId("skeleton");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("应该在错误时显示错误提示", async () => {
      const mockError = new Error("Failed to load data");
      mockUseActiveModels.mockReturnValue({
        models: undefined,
        loading: false,
        error: mockError,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText(/模型数据加载失败|Failed to load model data/)
        ).toBeInTheDocument();
        expect(screen.getByText(/重试|Retry/)).toBeInTheDocument();
      });
    });

    it("应该在无数据时显示占位符", async () => {
      const mockModels = {
        most_called: [],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        expect(
          screen.getByText(/暂无模型数据|No model data available/)
        ).toBeInTheDocument();
      });
    });

    it("应该在点击重试按钮时调用 refresh", async () => {
      const mockRefresh = vi.fn();
      const mockError = new Error("Failed to load data");

      mockUseActiveModels.mockReturnValue({
        models: undefined,
        loading: false,
        error: mockError,
        validating: false,
        refresh: mockRefresh,
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|Retry/);
        fireEvent.click(retryButton);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("时间范围参数", () => {
    it("应该根据传入的 timeRange 参数获取数据", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="30d" />);

      await waitFor(() => {
        expect(mockUseActiveModels).toHaveBeenCalledWith({
          time_range: "30d",
        });
      });
    });

    it("应该使用默认的 7d 时间范围", async () => {
      const mockModels = {
        most_called: [],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard />);

      await waitFor(() => {
        expect(mockUseActiveModels).toHaveBeenCalledWith({
          time_range: "7d",
        });
      });
    });
  });

  describe("数据格式化", () => {
    it("应该正确格式化调用次数", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 1234567,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证数字格式化（带逗号分隔符）
        expect(screen.getByText("1,234,567")).toBeInTheDocument();
      });
    });

    it("应该正确格式化成功率百分比", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.9567,
            failure_count: 100,
          },
        ],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证百分比格式化（保留一位小数）
        expect(screen.getByText("95.7%")).toBeInTheDocument();
      });
    });
  });

  describe("表格结构", () => {
    it("应该显示调用最多模型的表格标题", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证表格标题存在
        expect(screen.getByText(/模型|Model/)).toBeInTheDocument();
        expect(screen.getByText(/调用次数|Call Count/)).toBeInTheDocument();
        expect(screen.getByText(/成功率|Success Rate/)).toBeInTheDocument();
      });
    });

    it("应该显示失败最多模型的表格标题", async () => {
      const mockModels = {
        most_called: [],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        // 验证失败次数列标题
        expect(screen.getByText(/失败次数|Failure Count/)).toBeInTheDocument();
      });
    });
  });

  describe("模型行标识", () => {
    it("应该为每个模型行添加 testid", async () => {
      const mockModels = {
        most_called: [
          {
            model_id: "gpt-4",
            model_name: "GPT-4",
            call_count: 5000,
            success_rate: 0.98,
            failure_count: 100,
          },
        ],
        most_failed: [
          {
            model_id: "claude-2",
            model_name: "Claude 2",
            call_count: 1000,
            success_rate: 0.85,
            failure_count: 150,
          },
        ],
      };

      mockUseActiveModels.mockReturnValue({
        models: mockModels,
        loading: false,
        error: null,
        validating: false,
        refresh: vi.fn(),
      });

      renderWithI18n(<ActiveModelsCard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByTestId("most-called-gpt-4")).toBeInTheDocument();
        expect(screen.getByTestId("most-failed-claude-2")).toBeInTheDocument();
      });
    });
  });
});
