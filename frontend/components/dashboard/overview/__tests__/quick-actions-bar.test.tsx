/**
 * 快捷操作栏单元测试
 *
 * 测试覆盖：
 * - Property 11: 快捷操作按钮存在性
 * - Property 12: 快捷操作导航正确性
 * - 验证需求 4.1, 4.2, 4.3
 *
 * 注意：这是一个基础测试框架，实际运行需要配置 Jest/Vitest
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { QuickActionsBar } from "../quick-actions-bar";
import { I18nProvider } from "@/lib/i18n-context";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// 包装组件以提供 i18n 上下文
function renderWithI18n(component: React.ReactElement) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe("QuickActionsBar Component", () => {
  let mockPush: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);
    vi.clearAllMocks();
  });

  describe("Property 11: 快捷操作按钮存在性", () => {
    it("应该渲染所有三个快捷操作按钮", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        // 检查充值按钮
        expect(screen.getByTestId("quick-action-recharge")).toBeInTheDocument();
        expect(screen.getByText(/充值|Recharge/)).toBeInTheDocument();

        // 检查 Provider 管理按钮
        expect(screen.getByTestId("quick-action-manage_providers")).toBeInTheDocument();
        expect(screen.getByText(/Provider 管理|Manage Providers/)).toBeInTheDocument();

        // 检查路由配置按钮
        expect(screen.getByTestId("quick-action-routing_config")).toBeInTheDocument();
        expect(screen.getByText(/路由配置|Routing Config/)).toBeInTheDocument();
      });
    });

    it("应该为所有快捷操作按钮显示描述文案", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        expect(screen.getByText(/为账户充值积分|Add credits to your account/)).toBeInTheDocument();
        expect(screen.getByText(/管理 AI 服务提供商|Manage AI service providers/)).toBeInTheDocument();
        expect(screen.getByText(/配置请求路由策略|Configure request routing policies/)).toBeInTheDocument();
      });
    });

    it("应该显示快捷操作标题", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        expect(screen.getByText(/快捷操作|Quick Actions/)).toBeInTheDocument();
      });
    });
  });

  describe("Property 12: 快捷操作导航正确性", () => {
    it("应该在点击充值按钮时导航到积分管理页面", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        const rechargeButton = screen.getByTestId("quick-action-recharge");
        fireEvent.click(rechargeButton);

        expect(mockPush).toHaveBeenCalledWith("/dashboard/credits");
      });
    });

    it("应该在点击 Provider 管理按钮时导航到 Provider 管理页面", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        const manageProvidersButton = screen.getByTestId("quick-action-manage_providers");
        fireEvent.click(manageProvidersButton);

        expect(mockPush).toHaveBeenCalledWith("/dashboard/my-providers");
      });
    });

    it("应该在点击路由配置按钮时导航到路由配置页面", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        const routingButton = screen.getByTestId("quick-action-routing_config");
        fireEvent.click(routingButton);

        expect(mockPush).toHaveBeenCalledWith("/dashboard/routing");
      });
    });

    it("应该在点击按钮时调用 onNavigate 回调", async () => {
      const onNavigate = vi.fn();
      renderWithI18n(<QuickActionsBar onNavigate={onNavigate} />);

      await waitFor(() => {
        const rechargeButton = screen.getByTestId("quick-action-recharge");
        fireEvent.click(rechargeButton);

        expect(onNavigate).toHaveBeenCalledWith("/dashboard/credits");
      });
    });
  });

  describe("需求 4.1: 充值快捷按钮", () => {
    it("应该提供充值快捷按钮并导航到积分充值页面", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        const rechargeButton = screen.getByTestId("quick-action-recharge");
        expect(rechargeButton).toBeInTheDocument();

        fireEvent.click(rechargeButton);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/credits");
      });
    });
  });

  describe("需求 4.2: Provider 管理快捷按钮", () => {
    it("应该提供 Provider 管理快捷按钮并导航到 Provider 管理页面", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        const manageButton = screen.getByTestId("quick-action-manage_providers");
        expect(manageButton).toBeInTheDocument();

        fireEvent.click(manageButton);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/my-providers");
      });
    });
  });

  describe("需求 4.3: 路由配置快捷按钮", () => {
    it("应该提供路由配置快捷按钮并导航到路由配置页面", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        const routingButton = screen.getByTestId("quick-action-routing_config");
        expect(routingButton).toBeInTheDocument();

        fireEvent.click(routingButton);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/routing");
      });
    });
  });

  describe("需求 4.4: 快捷操作区域", () => {
    it("应该在概览页提供统一的快捷操作区域", async () => {
      renderWithI18n(<QuickActionsBar />);

      await waitFor(() => {
        // 验证所有快捷操作都在同一个卡片中
        expect(screen.getByText(/快捷操作|Quick Actions/)).toBeInTheDocument();

        // 验证所有按钮都存在
        expect(screen.getByTestId("quick-action-recharge")).toBeInTheDocument();
        expect(screen.getByTestId("quick-action-manage_providers")).toBeInTheDocument();
        expect(screen.getByTestId("quick-action-routing_config")).toBeInTheDocument();
      });
    });
  });
});
