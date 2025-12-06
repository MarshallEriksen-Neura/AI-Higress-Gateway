"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock, Bell, Globe } from "lucide-react";
import { SessionCard } from './components/session-card';
import { RevokeSessionDialog, RevokeAllSessionsDialog } from './components/revoke-session-dialog';
import { useSessions, useRevokeSession } from '@/lib/swr/use-sessions';
import { useI18n } from '@/lib/i18n-context';
import { toast } from 'sonner';
import type { SessionResponse } from '@/lib/api-types';

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const { t } = useI18n();
    const { sessions, loading, refresh } = useSessions();
    const { revokeSession, revokeOtherSessions } = useRevokeSession();
    
    const [selectedSession, setSelectedSession] = useState<SessionResponse | null>(null);
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    const otherSessionsCount = sessions.filter(s => !s.is_current).length;

    const handleRevoke = (sessionId: string) => {
        const session = sessions.find(s => s.session_id === sessionId);
        if (session) {
            setSelectedSession(session);
            setShowRevokeDialog(true);
        }
    };

    const handleConfirmRevoke = async () => {
        if (!selectedSession) return;
        
        setIsRevoking(true);
        try {
            await revokeSession(selectedSession.session_id);
            toast.success(t('sessions.revoke_success'));
            setShowRevokeDialog(false);
            refresh();
        } catch (error) {
            toast.error(t('sessions.revoke_error'));
        } finally {
            setIsRevoking(false);
        }
    };

    const handleRevokeAll = async () => {
        setIsRevoking(true);
        try {
            await revokeOtherSessions();
            toast.success(t('sessions.revoke_all_success'));
            setShowRevokeAllDialog(false);
            refresh();
        } catch (error) {
            toast.error(t('sessions.revoke_all_error'));
        } finally {
            setIsRevoking(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-muted-foreground">Manage your account settings and preferences</p>
            </div>

            {/* Profile Information */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your personal details</CardDescription>
                        </div>
                        <Button
                            variant={isEditing ? "outline" : "default"}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? "Cancel" : "Edit Profile"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-10 h-10 text-foreground" />
                        </div>
                        {isEditing && (
                            <Button variant="outline" size="sm">
                                Change Avatar
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center">
                                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                Full Name
                            </label>
                            <Input
                                defaultValue="Admin User"
                                disabled={!isEditing}
                                className={!isEditing ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                                Email
                            </label>
                            <Input
                                type="email"
                                defaultValue="admin@example.com"
                                disabled={!isEditing}
                                className={!isEditing ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <Input
                                defaultValue="Administrator"
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Account Created</label>
                            <Input
                                defaultValue="January 15, 2024"
                                disabled
                                className="bg-muted"
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => setIsEditing(false)}>
                                Save Changes
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-muted-foreground" />
                            Current Password
                        </label>
                        <Input type="password" placeholder="••••••••" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <Input type="password" placeholder="••••••••" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm New Password</label>
                        <Input type="password" placeholder="••••••••" />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button>Update Password</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('sessions.title')}</CardTitle>
                    <CardDescription>{t('sessions.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('common.loading') || 'Loading...'}
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('sessions.no_sessions')}
                        </div>
                    ) : (
                        <>
                            {sessions.map((session) => (
                                <SessionCard
                                    key={session.session_id}
                                    session={session}
                                    onRevoke={handleRevoke}
                                />
                            ))}
                            
                            {otherSessionsCount > 0 && (
                                <div className="pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setShowRevokeAllDialog(true)}
                                    >
                                        {t('sessions.revoke_all_other_sessions')} ({otherSessionsCount})
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Customize your experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Bell className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Email Notifications</p>
                                <p className="text-xs text-muted-foreground">
                                    Receive email updates about system events
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            Configure
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Language & Region</p>
                                <p className="text-xs text-muted-foreground">
                                    English (US)
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            Change
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Delete Account</p>
                            <p className="text-xs text-muted-foreground">
                                Permanently delete your account and all associated data
                            </p>
                        </div>
                        <Button variant="destructive" size="sm">
                            Delete Account
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <RevokeSessionDialog
                open={showRevokeDialog}
                onOpenChange={setShowRevokeDialog}
                session={selectedSession}
                onConfirm={handleConfirmRevoke}
                isRevoking={isRevoking}
            />
            
            <RevokeAllSessionsDialog
                open={showRevokeAllDialog}
                onOpenChange={setShowRevokeAllDialog}
                sessionCount={otherSessionsCount}
                onConfirm={handleRevokeAll}
                isRevoking={isRevoking}
            />
        </div>
    );
}
