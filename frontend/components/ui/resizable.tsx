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
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[orientation=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[orientation=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[orientation=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[orientation=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[orientation=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[orientation=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90 [&[data-orientation=vertical]>div]:rotate-90",
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
