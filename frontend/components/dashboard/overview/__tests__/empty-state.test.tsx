/**
 * 空数据状态组件单元测试
 *
 * 测试覆盖：
 * - 空数据提示显示
 * - 操作按钮功能
 * - 验证需求 7.4
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../empty-state";
import { AlertCircle } from "lucide-react";

describe("EmptyState Component", () => {
  describe("基础渲染", () => {
    it("应该渲染标题和消息", () => {
      render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
        />
      );

      expect(screen.getByText("暂无数据")).toBeInTheDocument();
      expect(screen.getByText("当前没有可显示的数据")).toBeInTheDocument();
    });

    it("应该在提供图标时显示图标", () => {
      const { container } = render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
          icon={<AlertCircle className="h-12 w-12" />}
        />
      );

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("应该在没有提供图标时不显示图标", () => {
      const { container } = render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
        />
      );

      // 检查是否没有额外的 SVG（除了可能的其他元素）
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(0);
    });
  });

  describe("操作按钮", () => {
    it("应该在提供 action 时显示操作按钮", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
          action={{
            label: "创建新项目",
            onClick: onAction,
          }}
        />
      );

      const button = screen.getByText("创建新项目");
      expect(button).toBeInTheDocument();
    });

    it("应该在点击操作按钮时调用回调", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
          action={{
            label: "创建新项目",
            onClick: onAction,
          }}
        />
      );

      const button = screen.getByText("创建新项目");
      fireEvent.click(button);

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("应该在没有 action 时不显示操作按钮", () => {
      render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
        />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("自定义样式", () => {
    it("应该应用自定义 className", () => {
      const { container } = render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("需求 7.4: 空数据提示显示", () => {
    it("应该显示友好的空数据提示", () => {
      render(
        <EmptyState
          title="暂无 Provider 数据"
          message="当前时间范围内没有 Provider 数据"
        />
      );

      expect(screen.getByText("暂无 Provider 数据")).toBeInTheDocument();
      expect(screen.getByText("当前时间范围内没有 Provider 数据")).toBeInTheDocument();
    });

    it("应该支持显示图标以增强视觉效果", () => {
      const { container } = render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
          icon={<AlertCircle className="h-12 w-12 text-muted-foreground" />}
        />
      );

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("应该支持提供操作按钮以引导用户", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="暂无数据"
          message="当前没有可显示的数据"
          action={{
            label: "开始使用",
            onClick: onAction,
          }}
        />
      );

      const button = screen.getByText("开始使用");
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe("完整场景", () => {
    it("应该显示完整的空数据状态（包含图标和操作按钮）", () => {
      const onAction = vi.fn();
      const { container } = render(
        <EmptyState
          title="暂无 Provider 数据"
          message="当前时间范围内没有 Provider 数据，请尝试调整时间范围"
          icon={<AlertCircle className="h-12 w-12 text-muted-foreground" />}
          action={{
            label: "调整时间范围",
            onClick: onAction,
          }}
        />
      );

      // 检查标题和消息
      expect(screen.getByText("暂无 Provider 数据")).toBeInTheDocument();
      expect(screen.getByText(/当前时间范围内没有 Provider 数据/)).toBeInTheDocument();

      // 检查图标
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();

      // 检查操作按钮
      const button = screen.getByText("调整时间范围");
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onAction).toHaveBeenCalled();
    });
  });
});
