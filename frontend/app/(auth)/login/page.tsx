"use client";

import React from "react";
import { AuthDialog } from "@/components/auth/auth-dialog";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <AuthDialog />
        </div>
    );
}
