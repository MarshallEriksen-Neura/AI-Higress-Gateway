/**
 * 时间范围筛选器组件单元测试
 *
 * 测试覆盖：
 * - Property 18: 时间范围选择本地存储
 * - 验证需求 6.3
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FilterBar } from "../filter-bar";
import { OverviewTimeRange } from "@/lib/swr/use-overview-metrics";
import { I18nProvider } from "@/lib/i18n-context";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("FilterBar Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Property 18: 时间范围选择本地存储", () => {
    it("应该将选择的时间范围保存到本地存储", async () => {
      const onTimeRangeChange = vi.fn();
      renderWithI18n(
        <FilterBar onTimeRangeChange={onTimeRangeChange} />
      );

      // 等待组件水合
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      // 选择 30 天
      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const option30d = screen.getByText(/最近 30 天|Last 30 Days/);
      await userEvent.click(option30d);

      // 验证本地存储
      expect(localStorage.getItem("dashboard_overview_time_range")).toBe("30d");
      expect(onTimeRangeChange).toHaveBeenCalledWith("30d");
    });

    it("应该在页面刷新后恢复保存的时间范围选择", async () => {
      // 设置初始值
      localStorage.setItem("dashboard_overview_time_range", "90d");

      const onTimeRangeChange = vi.fn();
      renderWithI18n(
        <FilterBar onTimeRangeChange={onTimeRangeChange} />
      );

      // 等待组件水合和恢复
      await waitFor(() => {
        const select = screen.getByRole("combobox");
        expect(select).toHaveValue("90d");
      });
    });

    it("应该支持所有时间范围选项", async () => {
      const timeRanges: OverviewTimeRange[] = ["today", "7d", "30d", "all"];
      const onTimeRangeChange = vi.fn();

      for (const range of timeRanges) {
        localStorage.clear();
        onTimeRangeChange.mockClear();

        const { unmount } = renderWithI18n(
          <FilterBar onTimeRangeChange={onTimeRangeChange} />
        );

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

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
            (range === "all" && (text.includes("All") || text.includes("全部")))
          );
        });

        if (targetOption) {
          await userEvent.click(targetOption);
          expect(localStorage.getItem("dashboard_overview_time_range")).toBe(
            range
          );
        }

        unmount();
      }
    });

    it("应该在无效的本地存储值时使用默认值", async () => {
      localStorage.setItem("dashboard_overview_time_range", "invalid");

      renderWithI18n(<FilterBar />);

      await waitFor(() => {
        const select = screen.getByRole("combobox");
        // 应该使用默认值 "7d"
        expect(select).toHaveValue("7d");
      });
    });

    it("应该在本地存储错误时优雅地处理", async () => {
      const getItemSpy = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("Storage error");
        });

      // 应该不抛出错误
      expect(() => {
        renderWithI18n(<FilterBar />);
      }).not.toThrow();

      getItemSpy.mockRestore();
    });
  });

  describe("需求 6.1: 时间范围筛选器选项完整性", () => {
    it("应该显示所有五个时间范围选项", async () => {
      renderWithI18n(<FilterBar />);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      // 验证所有选项都存在
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("需求 6.2: 时间范围切换数据更新", () => {
    it("应该在时间范围变化时触发回调", async () => {
      const onTimeRangeChange = vi.fn();
      renderWithI18n(
        <FilterBar onTimeRangeChange={onTimeRangeChange} />
      );

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      const option = screen.getByText(/最近 7 天|Last 7 Days/);
      await userEvent.click(option);

      expect(onTimeRangeChange).toHaveBeenCalledWith("7d");
    });
  });
});
