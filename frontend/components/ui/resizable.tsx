"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  ...props
}: React.ComponentProps<typeof PanelGroup> & { direction?: "horizontal" | "vertical" }) {
  return (
    <PanelGroup
      data-slot="resizable-panel-group"
      data-panel-group-direction={direction}
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col data-[orientation=vertical]:flex-col",
        className
      )}
      orientation={direction}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean
}) {
  return (
    <PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "focus-visible:ring-ring relative flex select-none touch-none items-center justify-center bg-transparent focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
        "after:content-[''] after:absolute after:bg-border",
        "aria-[orientation=vertical]:w-2 aria-[orientation=vertical]:cursor-col-resize aria-[orientation=vertical]:after:inset-y-0 aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-px aria-[orientation=vertical]:after:-translate-x-1/2",
        "aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-px aria-[orientation=horizontal]:after:-translate-y-1/2",
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
