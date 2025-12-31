"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

export function ThemeBackground() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || theme !== "christmas") {
    return null;
  }

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <Image
        src="/theme/christmas/background.png"
        alt="Christmas Background"
        fill
        className="object-cover"
        priority
      />
      {/* 减少遮罩透明度，让背景更明显 */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.05) 100%)"
        }}
      />
    </div>
  );
}
