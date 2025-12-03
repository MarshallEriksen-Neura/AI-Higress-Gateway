"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-context";

interface ApiKeysFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApiKeysForm({ open, onOpenChange }: ApiKeysFormProps) {
    const { t } = useI18n();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                        Generate a new API key for accessing the AI Higress API
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Key Name</label>
                        <Input placeholder="e.g., Production Key" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description (Optional)</label>
                        <Input placeholder="Describe the purpose of this key" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onOpenChange(false)}>Generate Key</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}