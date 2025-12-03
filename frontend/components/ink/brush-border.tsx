import React from "react";
import { cn } from "@/lib/utils";

interface BrushBorderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function BrushBorder({ children, className, ...props }: BrushBorderProps) {
    return (
        <div
            className={cn(
                "relative p-1",
                className
            )}
            {...props}
        >
            {/* SVG Filter for rough edges */}
            <svg className="absolute w-0 h-0">
                <filter id="brush-displacement">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
                </filter>
            </svg>

            <div
                className="relative bg-card text-card-foreground p-6 rounded-lg border-2 border-foreground/80"
                style={{
                    filter: "url(#brush-displacement)",
                    boxShadow: "3px 3px 6px rgba(0,0,0,0.1)",
                }}
            >
                {children}
            </div>

            {/* Decorative Ink Splatter (Optional) */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-foreground/20 rounded-full blur-[2px]" />
        </div>
    );
}
