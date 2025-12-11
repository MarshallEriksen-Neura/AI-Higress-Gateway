/**
 * 错误状态组件单元测试
 *
 * 测试覆盖：
 * - 错误提示显示
 * - 重试功能
 * - 验证需求 7.4
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "../error-state";

describe("ErrorState Component", () => {
  describe("卡片变体", () => {
    it("应该渲染错误标题和消息", () => {
      render(
        <ErrorState
          title="加载失败"
          message="无法加载数据，请稍后重试"
          variant="card"
        />
      );

      expect(screen.getByText("加载失败")).toBeInTheDocument();
      expect(screen.getByText("无法加载数据，请稍后重试")).toBeInTheDocument();
    });

    it("应该显示错误图标", () => {
      const { container } = render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          variant="card"
        />
      );

      // 检查是否存在 AlertCircle 图标
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("应该在提供 onRetry 时显示重试按钮", () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          onRetry={onRetry}
          retryLabel="重试"
          variant="card"
        />
      );

      const retryButton = screen.getByText("重试");
      expect(retryButton).toBeInTheDocument();
    });

    it("应该在点击重试按钮时调用 onRetry 回调", () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          onRetry={onRetry}
          retryLabel="重试"
          variant="card"
        />
      );

      const retryButton = screen.getByText("重试");
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("应该在没有 onRetry 时不显示重试按钮", () => {
      render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          variant="card"
        />
      );

      expect(screen.queryByText("Retry")).not.toBeInTheDocument();
    });

    it("应该应用自定义 className", () => {
      const { container } = render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          variant="card"
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Alert 变体", () => {
    it("应该渲染 Alert 变体", () => {
      render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          variant="alert"
        />
      );

      expect(screen.getByText("加载失败")).toBeInTheDocument();
      expect(screen.getByText("无法加载数据")).toBeInTheDocument();
    });

    it("应该在 Alert 变体中显示重试按钮", () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="加载失败"
          message="无法加载数据"
          onRetry={onRetry}
          retryLabel="重试"
          variant="alert"
        />
      );

      const retryButton = screen.getByText("重试");
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe("需求 7.4: 错误提示显示", () => {
    it("应该显示错误提示卡片", () => {
      render(
        <ErrorState
          title="数据加载失败"
          message="无法从服务器加载数据"
          variant="card"
        />
      );

      expect(screen.getByText("数据加载失败")).toBeInTheDocument();
      expect(screen.getByText("无法从服务器加载数据")).toBeInTheDocument();
    });

    it("应该提供重试功能", () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="数据加载失败"
          message="无法从服务器加载数据"
          onRetry={onRetry}
          retryLabel="重试"
          variant="card"
        />
      );

      const retryButton = screen.getByText("重试");
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});
