"use client";

import { useActionState, useMemo, useState } from "react";

import { acceptOwnerAgreement, type AcceptOwnerAgreementState } from "./actions";

const initialState: AcceptOwnerAgreementState = { error: null };

export function AgreementForm() {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [state, formAction, pending] = useActionState(acceptOwnerAgreement, initialState);
  const canSubmit = useMemo(() => agreed && signature.trim().length > 0 && !pending, [agreed, signature, pending]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
          required
        />
        <span>I have read and agree to the PixieDVC Owner Platform Agreement.</span>
      </label>

      <label className="block">
        <span className="text-sm text-slate-700">
          Type your full legal name (as shown on your DVC membership)
        </span>
        <input
          type="text"
          name="agreement_signature"
          value={signature}
          onChange={(event) => setSignature(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
          autoComplete="name"
          required
        />
      </label>

      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Accept & Continue"}
      </button>
    </form>
  );
}
