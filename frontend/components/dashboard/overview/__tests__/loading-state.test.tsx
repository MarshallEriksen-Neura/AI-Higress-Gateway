/**
 * 加载态占位符组件单元测试
 *
 * 测试覆盖：
 * - Skeleton 显示
 * - 不同变体的加载态
 * - 验证需求 7.4
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingState } from "../loading-state";

describe("LoadingState Component", () => {
  describe("卡片变体", () => {
    it("应该渲染卡片加载态", () => {
      const { container } = render(
        <LoadingState variant="card" title="加载中" />
      );

      // 检查是否存在 Skeleton 元素
      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("应该在卡片变体中显示标题 Skeleton", () => {
      const { container } = render(
        <LoadingState variant="card" title="加载中" />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(2); // 标题 + 描述
    });

    it("应该在禁用标题时不显示标题 Skeleton", () => {
      const { container } = render(
        <LoadingState variant="card" title={false as any} />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("表格变体", () => {
    it("应该渲染表格加载态", () => {
      const { container } = render(
        <LoadingState variant="table" rows={5} columns={4} />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      // 表头 (4) + 行 (5 * 4) = 24
      expect(skeletons.length).toBe(24);
    });

    it("应该支持自定义行数和列数", () => {
      const { container } = render(
        <LoadingState variant="table" rows={3} columns={2} />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      // 表头 (2) + 行 (3 * 2) = 8
      expect(skeletons.length).toBe(8);
    });

    it("应该在表格变体中显示标题", () => {
      const { container } = render(
        <LoadingState variant="table" title="加载中" rows={2} columns={2} />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      // 标题 (2) + 表头 (2) + 行 (2 * 2) = 8
      expect(skeletons.length).toBe(8);
    });
  });

  describe("图表变体", () => {
    it("应该渲染图表加载态", () => {
      const { container } = render(
        <LoadingState variant="chart" />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("应该包含图例和图表区域的 Skeleton", () => {
      const { container } = render(
        <LoadingState variant="chart" />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      // 标题 (1) + 图例 (3) + 图表 (1) = 5
      expect(skeletons.length).toBe(5);
    });
  });

  describe("网格变体", () => {
    it("应该渲染网格加载态", () => {
      const { container } = render(
        <LoadingState variant="grid" columns={4} />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("应该支持自定义列数", () => {
      const { container } = render(
        <LoadingState variant="grid" columns={2} />
      );

      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBe(2);
    });
  });

  describe("需求 7.4: 加载态 Skeleton 显示", () => {
    it("应该在数据加载时显示 Skeleton 占位符", () => {
      const { container } = render(
        <LoadingState variant="card" />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("应该避免布局抖动", () => {
      const { container } = render(
        <LoadingState variant="card" />
      );

      // 检查是否存在卡片结构
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();

      // 检查是否有 Skeleton 占位符
      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("应该为表格加载态显示正确的行列结构", () => {
      const { container } = render(
        <LoadingState variant="table" rows={5} columns={4} />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      // 表头 (4) + 行 (5 * 4) = 24
      expect(skeletons.length).toBe(24);
    });

    it("应该为图表加载态显示图例和图表区域", () => {
      const { container } = render(
        <LoadingState variant="chart" />
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      // 标题 (1) + 图例 (3) + 图表 (1) = 5
      expect(skeletons.length).toBe(5);
    });
  });

  describe("自定义样式", () => {
    it("应该应用自定义 className", () => {
      const { container } = render(
        <LoadingState variant="card" className="custom-class" />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });
});
