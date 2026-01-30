"use client";

import { useActionState } from "react";
import { useState } from "react";

type ActionState = { error?: string | null };

type Props = {
  token: string;
  onAccept: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
};

export default function AcceptanceFormClient({ token, onAccept }: Props) {
  const [checked, setChecked] = useState(false);
  const [state, formAction] = useActionState(onAccept, { error: null });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="confirm"
            required
            className="mt-1"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>
            I have read and agree to the{" "}
            <a href="#rental-agreement" className="font-semibold text-slate-900 hover:underline">
              Rental Agreement
            </a>{" "}
            and{" "}
            <a href="#cancellation-policy" className="font-semibold text-slate-900 hover:underline">
              Cancellation Policy
            </a>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={!checked}
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-slate-900 disabled:hover:shadow-none"
        >
          Accept Agreement &amp; Continue to Payment
        </button>
        <p className="text-xs text-slate-500">
          By clicking “Accept Agreement &amp; Continue to Payment,” you confirm that you are the authorized guest and
          agree to be legally bound by this agreement. This constitutes an electronic signature.
        </p>
        {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </form>
    </div>
  );
}
