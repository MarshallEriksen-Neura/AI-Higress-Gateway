"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 动态加载 Dialog 组件
const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => ({ default: mod.Dialog })), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => ({ default: mod.DialogContent })), { ssr: false });
const DialogDescription = dynamic(() => import("@/components/ui/dialog").then(mod => ({ default: mod.DialogDescription })), { ssr: false });
const DialogFooter = dynamic(() => import("@/components/ui/dialog").then(mod => ({ default: mod.DialogFooter })), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then(mod => ({ default: mod.DialogHeader })), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then(mod => ({ default: mod.DialogTitle })), { ssr: false });

interface LogicalModelsFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LogicalModelsForm({ open, onOpenChange }: LogicalModelsFormProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Logical Model</DialogTitle>
                    <DialogDescription>
                        Map a logical model name to physical model implementations
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Logical Model Name</label>
                        <Input placeholder="e.g., gpt-4-turbo" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Provider</label>
                        <Input placeholder="e.g., OpenAI" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Physical Model ID</label>
                        <Input placeholder="e.g., gpt-4-turbo-2024-04-09" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onOpenChange(false)}>Create Model</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}