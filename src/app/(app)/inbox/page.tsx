/**
 * Inbox (SERVER, protected).
 *
 * Re-validates the session server-side, then loads REAL in-flight workflow
 * cases scoped to the user's accessible projects. No fake tasks/cards; an empty
 * result renders a real empty state.
 *
 * Requirements: 10.4, 4.3
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadInboxItems } from "@/server/inbox";
import { ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";
import { InboxView } from "./InboxView";

export default async function InboxPage() {
  const user = await requirePageUser("/inbox");

  let items;
  try {
    items = await loadInboxItems(user);
  } catch {
    return (
      <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />
    );
  }

  return <InboxView items={items} />;
}
