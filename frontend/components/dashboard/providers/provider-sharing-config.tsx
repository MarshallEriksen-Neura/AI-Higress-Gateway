"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { providerService } from "@/http/provider";
import { useErrorDisplay } from "@/lib/errors";
import { useUserSearch } from "@/lib/hooks/use-user-search";
import { useI18n } from "@/lib/i18n-context";
import type { ProviderVisibility } from "@/http/provider";
import type { UserLookup } from "@/http/user";

interface ProviderSharingConfigProps {
  providerId: string;
  effectiveUserId: string;
  provider: {
    visibility?: ProviderVisibility;
  };
}

export const ProviderSharingConfig = ({ 
  providerId, 
  effectiveUserId, 
  provider 
}: ProviderSharingConfigProps) => {
  const { t } = useI18n();
  const { showError } = useErrorDisplay();
  
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [sharedUserDetails, setSharedUserDetails] = useState<UserLookup[]>([]);
  const [sharedVisibility, setSharedVisibility] = useState<ProviderVisibility | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedSaving, setSharedSaving] = useState(false);

  const {
    query: userSearchQuery,
    setQuery: setUserSearchQuery,
    results: userSearchResults,
    loading: userSearchLoading,
    reset: resetUserSearch,
    fetchByIds: fetchUsersByIds,
  } = useUserSearch({ excludeIds: sharedUserIds });

  const loadSharedUserDetails = useCallback(async (userIds: string[]) => {
    const users = await fetchUsersByIds(userIds);
    setSharedUserDetails(users);
  }, [fetchUsersByIds]);

  const fetchSharedUsers = useCallback(async () => {
    setSharedLoading(true);
    try {
      const resp = await providerService.getProviderSharedUsers(
        effectiveUserId,
        providerId,
      );
      const ids = resp.shared_user_ids || [];
      setSharedUserIds(ids);
      await loadSharedUserDetails(ids);
      setSharedVisibility(resp.visibility);
    } catch (err) {
      showError(err, {
        context: t("providers.sharing_error_load"),
      });
    } finally {
      setSharedLoading(false);
    }
  }, [effectiveUserId, providerId, showError, t, loadSharedUserDetails]);

  useEffect(() => {
    fetchSharedUsers();
  }, [fetchSharedUsers]);

  const handleAddSharedUser = useCallback((user: UserLookup) => {
    if (sharedUserIds.includes(user.id)) {
      return;
    }
    setSharedUserIds((prev) => [...prev, user.id]);
    setSharedUserDetails((prev) => [...prev, user]);
    resetUserSearch();
  }, [sharedUserIds, resetUserSearch]);

  const handleRemoveSharedUser = useCallback((userId: string) => {
    setSharedUserIds((prev) => prev.filter((id) => id !== userId));
    setSharedUserDetails((prev) => prev.filter((user) => user.id !== userId));
  }, []);

  const handleSaveSharing = useCallback(async () => {
    setSharedSaving(true);
    try {
      const resp = await providerService.updateProviderSharedUsers(
        effectiveUserId,
        providerId,
        { user_ids: sharedUserIds },
      );
      setSharedVisibility(resp.visibility);
      toast.success(t("providers.sharing_save_success"));
    } catch (err) {
      showError(err, {
        context: t("providers.sharing_save_error"),
      });
    } finally {
      setSharedSaving(false);
    }
  }, [effectiveUserId, providerId, sharedUserIds, t, showError]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("providers.sharing_title")}</CardTitle>
        <CardDescription>{t("providers.sharing_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {(sharedVisibility || provider.visibility) === "restricted"
            ? t("providers.sharing_visibility_restricted")
            : t("providers.sharing_visibility_private")}
        </div>
        <div className="space-y-3">
          <Label htmlFor="shared-users">{t("providers.sharing_user_ids_label")}</Label>
          <p className="text-sm text-muted-foreground">{t("providers.sharing_hint")}</p>
          <div className="rounded-md border p-2 min-h-[52px] flex flex-wrap gap-2">
            {sharedUserDetails.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                {t("providers.sharing_selected_empty")}
              </span>
            ) : (
              sharedUserDetails.map((user) => (
                <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                  <span>{user.display_name || user.username || user.email}</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full hover:text-destructive transition-colors"
                    onClick={() => handleRemoveSharedUser(user.id)}
                    aria-label={t("providers.sharing_remove_user")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="space-y-2">
            <Input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder={t("providers.sharing_search_placeholder")}
              disabled={sharedLoading || sharedSaving}
            />
            {userSearchQuery.trim().length >= 2 && (
              <div className="rounded-md border overflow-hidden">
                {userSearchLoading ? (
                  <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("providers.loading")}
                  </div>
                ) : userSearchResults.length > 0 ? (
                  <div className="max-h-60 overflow-auto divide-y">
                    {userSearchResults.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                        onClick={() => handleAddSharedUser(user)}
                      >
                        <div className="font-medium">
                          {user.display_name || user.username || user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">
                    {t("providers.sharing_no_results")}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("providers.sharing_hint_helper")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSaveSharing}
            disabled={sharedSaving || sharedLoading}
          >
            {sharedSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("providers.sharing_saving")}
              </>
            ) : (
              t("providers.sharing_save")
            )}
          </Button>
          <Button
            variant="outline"
            onClick={fetchSharedUsers}
            disabled={sharedLoading || sharedSaving}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${sharedLoading ? "animate-spin" : ""}`} />
            {sharedLoading
              ? t("providers.sharing_loading")
              : t("providers.sharing_refresh")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
