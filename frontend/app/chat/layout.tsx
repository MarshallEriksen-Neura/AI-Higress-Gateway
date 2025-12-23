import React from "react";

import { ChatNavRail } from "./components/chat-nav-rail";
import { ChatLayoutRootClient } from "./components/chat-layout-root-client";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--muted)]">
      {/* 桌面端导航栏 - 在移动端隐藏 */}
      <div className="hidden md:block h-full">
        <ChatNavRail />
      </div>
      <div className="flex-1 h-full overflow-hidden">
        <ChatLayoutRootClient>{children}</ChatLayoutRootClient>
      </div>
    </div>
  );
}
