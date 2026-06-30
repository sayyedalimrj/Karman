"use client";

/**
 * LoginForm — client form posting to the REAL auth route (POST /api/auth).
 *
 * Security/UX rules enforced here:
 * - The password is NEVER logged or persisted anywhere on the client.
 * - On failure a single GENERIC message is shown; the UI never reveals whether
 *   the email or the password was wrong (the server returns the same generic
 *   401 for both).
 * - On success we perform a full navigation to the sanitized `next` target so
 *   the freshly-set session cookie is used by the server layout/middleware.
 *
 * Requirements: 2.1, 2.3
 */
import * as React from "react";
import { Button } from "@/components/ui";
import { GlassPanel } from "@/components/shell";
import { t } from "@/lib/i18n";

export interface LoginFormProps {
  /** Pre-sanitized, same-origin relative redirect target. */
  next: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // NOTE: password is sent only in this request body; never logged.
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.assign(next);
        return;
      }

      // Any non-OK response → the same generic credential error (no disclosure).
      setError(t.auth.invalidCredentials);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <GlassPanel strong className="login__card">
        <div className="login__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="login__logo" src="/brand/logo.png" alt={t.app.name} />
        </div>
        <h1 className="login__title">{t.auth.loginTitle}</h1>
        <p className="login__subtitle">{t.auth.loginSubtitle}</p>

        <form className="login__form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="email">
              {t.auth.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field__input tabular-digits"
              autoComplete="username"
              dir="ltr"
              required
              value={email}
              placeholder={t.auth.emailPlaceholder}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">
              {t.auth.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field__input"
              autoComplete="current-password"
              dir="ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <p className="form-error" role="alert" aria-live="polite">
            {error}
          </p>

          <Button type="submit" block disabled={submitting}>
            {submitting ? t.auth.submitting : t.auth.submit}
          </Button>
        </form>
      </GlassPanel>
    </div>
  );
}
