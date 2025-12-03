import React from "react";
import { cn } from "@/lib/utils";

interface InkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
}

export function InkButton({
    children,
    className,
    variant = "primary",
    size = "default",
    ...props
}: InkButtonProps) {
    const baseStyles = "relative overflow-hidden rounded-md font-serif transition-all duration-300 group inline-flex items-center justify-center";

    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border-2 border-primary text-primary hover:bg-primary/10",
        ghost: "hover:bg-muted text-foreground",
    };

    const sizes = {
        default: "px-6 py-2",
        sm: "px-4 py-1 text-sm",
        lg: "px-8 py-3 text-lg",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            <span className="relative z-10">{children}</span>

            {/* Ink Spread Effect on Hover */}
            <span className="absolute inset-0 bg-foreground/10 transform scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full origin-center opacity-0 group-hover:opacity-100 blur-xl" />
        </button>
    );
}
