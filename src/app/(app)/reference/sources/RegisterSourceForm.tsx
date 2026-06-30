"use client";
/**
 * RegisterSourceForm — client form for registering a reference SOURCE.
 *
 * Posts to the real `registerReferenceSourceAction` server action (which
 * enforces authorization server-side and writes the source + audit row
 * atomically). This form does NOT upload or parse files; it records source
 * metadata only. Success shows the honest "extraction/mapping happens next"
 * message.
 *
 * Requirements: 15.1, 15.4, 4.2
 */
import * as React from "react";
import { useActionState } from "react";
import {
  registerReferenceSourceAction,
  type RegisterSourceState,
} from "@/server/reference/register-source";
import { t } from "@/lib/i18n";

const SOURCE_TYPE_KEYS = [
  "TAKSA_DB",
  "TAKSA_SQL_SCRIPT",
  "SVZT",
  "BRVT",
  "PSNT",
  "EXCEL",
  "PDF_OFFICIAL_DOC",
  "MANUAL_VERIFIED",
] as const;

const initialState: RegisterSourceState = { ok: false };

export function RegisterSourceForm() {
  const [state, formAction, pending] = useActionState(
    registerReferenceSourceAction,
    initialState,
  );

  return (
    <form action={formAction} className="ref-form">
      <div className="field">
        <label className="field__label" htmlFor="sourceType">
          {t.reference.sources.fieldType}
        </label>
        <select id="sourceType" name="sourceType" className="field__input" required>
          {SOURCE_TYPE_KEYS.map((k) => (
            <option key={k} value={k}>
              {t.referenceSourceType[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="name">
          {t.reference.sources.fieldName}
        </label>
        <input id="name" name="name" className="field__input" required maxLength={256} />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="originalFileName">
          {t.reference.sources.fieldFile}
        </label>
        <input id="originalFileName" name="originalFileName" className="field__input" />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="originalDbName">
          {t.reference.sources.fieldDb}
        </label>
        <input id="originalDbName" name="originalDbName" className="field__input" />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="originalScriptName">
          {t.reference.sources.fieldScript}
        </label>
        <input id="originalScriptName" name="originalScriptName" className="field__input" />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="checksum">
          {t.reference.sources.fieldChecksum}
        </label>
        <input id="checksum" name="checksum" className="field__input" />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="description">
          {t.reference.sources.fieldDescription}
        </label>
        <textarea id="description" name="description" className="field__input" rows={2} />
      </div>

      <p className="form-note">{t.reference.sources.noteNoParse}</p>

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? t.reference.sources.submitting : t.reference.sources.submit}
      </button>

      {state.ok ? (
        <p className="form-success" role="status">
          {t.reference.sources.success}
        </p>
      ) : null}
      {state.error === "forbidden" ? (
        <p className="form-error" role="alert">
          {t.reference.sources.forbidden}
        </p>
      ) : null}
      {state.error === "invalid" ? (
        <p className="form-error" role="alert">
          {t.reference.sources.invalid}
        </p>
      ) : null}
    </form>
  );
}
