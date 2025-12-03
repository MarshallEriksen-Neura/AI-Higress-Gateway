"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Server, Database, Shield, Zap } from "lucide-react";

const systemStats = [
    { title: "Uptime", value: "99.98%", icon: Server },
    { title: "Database Size", value: "2.4 GB", icon: Database },
    { title: "Security Score", value: "A+", icon: Shield },
    { title: "Cache Size", value: "512 MB", icon: Zap },
];

export default function SystemAdminPage() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <h1 className="text-3xl font-bold mb-2">System Administration</h1>
                <p className="text-muted-foreground">Manage system settings and configuration</p>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systemStats.map((stat, index) => (
                    <Card key={index}>
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                        {stat.title}
                                    </p>
                                    <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                                </div>
                                <div className="p-2 bg-muted rounded">
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">API Base URL</label>
                            <Input placeholder="https://api.example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Max Concurrent Requests</label>
                            <Input type="number" placeholder="1000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Request Timeout (ms)</label>
                            <Input type="number" placeholder="30000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cache TTL (seconds)</label>
                            <Input type="number" placeholder="3600" />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline">Reset</Button>
                        <Button>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Maintenance */}
            <Card>
                <CardHeader>
                    <CardTitle>Maintenance Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col">
                            <Database className="w-6 h-6 mb-2" />
                            Clear Cache
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col">
                            <Server className="w-6 h-6 mb-2" />
                            Restart Services
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col">
                            <Shield className="w-6 h-6 mb-2" />
                            Run Security Scan
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
