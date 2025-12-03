"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrushBorder } from "@/components/ink/brush-border";
import { InkButton } from "@/components/ink/ink-button";
import { FormInput } from "@/components/forms/form-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n-context";

type AuthMode = "login" | "register";

export function AuthDialog() {
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("login");

  const isLogin = mode === "login";

  return (
    <Dialog defaultOpen>
      <DialogContent className="max-w-md w-full">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-serif font-bold">
            {t("app.title")}
          </DialogTitle>
          <DialogDescription>
            {isLogin ? t("auth.login.subtitle") : t("auth.register.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <BrushBorder className="mt-4">
          <form className="space-y-6">
            {!isLogin && (
              <FormInput
                label={t("auth.name_label")}
                type="text"
                placeholder={t("auth.name_placeholder")}
                required
              />
            )}

            <FormInput
              label={t("auth.email_label")}
              type="email"
              placeholder={t("auth.email_placeholder")}
              required
            />

            <FormInput
              label={t("auth.password_label")}
              type="password"
              placeholder={t("auth.password_placeholder")}
              required
            />

            {!isLogin && (
              <FormInput
                label={t("auth.confirm_password_label")}
                type="password"
                placeholder={t("auth.confirm_password_placeholder")}
                required
              />
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span>{t("auth.remember_me")}</span>
                </label>
                <Link href="#" className="text-primary hover:underline">
                  {t("auth.forgot_password")}
                </Link>
              </div>
            )}

            <InkButton className="w-full" type="submit">
              {isLogin ? t("auth.login_button") : t("auth.register_button")}
            </InkButton>
          </form>
        </BrushBorder>

        <div className="mt-4 text-center text-sm">
          {isLogin ? (
            <p className="text-muted-foreground">
              {t("auth.no_account")}{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-primary hover:underline font-medium"
              >
                {t("auth.signup_link")}
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground">
              {t("auth.have_account")}{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline font-medium"
              >
                {t("auth.signin_link")}
              </button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

