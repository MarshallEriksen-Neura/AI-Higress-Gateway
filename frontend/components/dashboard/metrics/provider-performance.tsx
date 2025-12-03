"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProviderPerformance() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Provider Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Chart Placeholder
                </div>
            </CardContent>
        </Card>
    );
}