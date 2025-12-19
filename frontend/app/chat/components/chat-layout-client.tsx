"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AssistantSidebar } from "./assistant-sidebar";
import { ChatMain } from "./chat-main";
import { RightPanel } from "./right-panel";

export function ChatLayout() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* 左侧：助手列表 */}
      <ResizablePanel defaultSize="20%" minSize="15%" maxSize="30%">
        <AssistantSidebar />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* 中间：聊天主区域 */}
      <ResizablePanel defaultSize="50%" minSize="30%">
        <ChatMain />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* 右侧：预设 Prompt + 历史记录 */}
      <ResizablePanel defaultSize="30%" minSize="20%" maxSize="40%">
        <RightPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
