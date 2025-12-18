"use client";
import {
  AdaptiveSidebar,
  NeonSidebar,
  ThemeSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/sidebars";
import { Home, Settings, Users, FileText, BarChart } from "lucide-react";

/**
 * Sidebar 示例组件
 */
export function SidebarExamples() {
  return (
    <div className="space-y-8">
      {/* AdaptiveSidebar 示例 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">自适应主题侧边栏</h3>
        <p className="text-sm text-muted-foreground">
          根据当前主题自动切换样式（圣诞主题使用霓虹灯效果）
        </p>
        <div className="h-[500px] border rounded-lg overflow-hidden">
          <SidebarProvider defaultOpen={true}>
            <AdaptiveSidebar>
              <SidebarHeader>
                <div className="px-2 py-4">
                  <h2 className="text-lg font-semibold">自适应侧边栏</h2>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>主菜单</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <Home className="h-4 w-4" />
                          <span>首页</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <Users className="h-4 w-4" />
                          <span>用户管理</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <FileText className="h-4 w-4" />
                          <span>文档</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <BarChart className="h-4 w-4" />
                          <span>统计</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Settings className="h-4 w-4" />
                      <span>设置</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </AdaptiveSidebar>
          </SidebarProvider>
        </div>
      </div>

      {/* NeonSidebar 示例 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">霓虹灯侧边栏（圣诞主题）</h3>
        <p className="text-sm text-muted-foreground">
          玻璃拟态 + 霓虹灯边框 + 圣诞装饰（彩球和花环）
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 红色霓虹灯 */}
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <SidebarProvider defaultOpen={true}>
              <NeonSidebar neonColor="red" neonIntensity={2} enableFrostTexture={true}>
                <SidebarHeader>
                  <div className="px-2 py-2">
                    <h3 className="text-sm font-semibold">红色霓虹</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <Home className="h-4 w-4" />
                            <span>首页</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <Users className="h-4 w-4" />
                            <span>用户</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </NeonSidebar>
            </SidebarProvider>
          </div>

          {/* 绿色霓虹灯 */}
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <SidebarProvider defaultOpen={true}>
              <NeonSidebar neonColor="green" neonIntensity={2} enableFrostTexture={true}>
                <SidebarHeader>
                  <div className="px-2 py-2">
                    <h3 className="text-sm font-semibold">绿色霓虹</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <FileText className="h-4 w-4" />
                            <span>文档</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <BarChart className="h-4 w-4" />
                            <span>统计</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </NeonSidebar>
            </SidebarProvider>
          </div>

          {/* 蓝色霓虹灯 */}
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <SidebarProvider defaultOpen={true}>
              <NeonSidebar neonColor="blue" neonIntensity={3} enableFrostTexture={true}>
                <SidebarHeader>
                  <div className="px-2 py-2">
                    <h3 className="text-sm font-semibold">蓝色霓虹</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <Settings className="h-4 w-4" />
                            <span>设置</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </NeonSidebar>
            </SidebarProvider>
          </div>
        </div>
      </div>

      {/* ThemeSidebar 示例 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">主题感知侧边栏</h3>
        <p className="text-sm text-muted-foreground">
          支持 default、glass、neon 三种变体
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Default 变体 */}
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <SidebarProvider defaultOpen={true}>
              <ThemeSidebar themeVariant="default" themeAware={false}>
                <SidebarHeader>
                  <div className="px-2 py-2">
                    <h3 className="text-sm font-semibold">默认样式</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <Home className="h-4 w-4" />
                            <span>首页</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </ThemeSidebar>
            </SidebarProvider>
          </div>

          {/* Glass 变体 */}
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <SidebarProvider defaultOpen={true}>
              <ThemeSidebar themeVariant="glass" themeAware={false}>
                <SidebarHeader>
                  <div className="px-2 py-2">
                    <h3 className="text-sm font-semibold">玻璃拟态</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <Users className="h-4 w-4" />
                            <span>用户</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </ThemeSidebar>
            </SidebarProvider>
          </div>

          {/* Neon 变体 */}
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <SidebarProvider defaultOpen={true}>
              <ThemeSidebar themeVariant="neon" themeAware={false} neonColor="purple">
                <SidebarHeader>
                  <div className="px-2 py-2">
                    <h3 className="text-sm font-semibold">霓虹灯效果</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton>
                            <FileText className="h-4 w-4" />
                            <span>文档</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </ThemeSidebar>
            </SidebarProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
