"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button, Card, FieldLabel, HelperText, TextArea, TextInput } from "@pixiedvc/design-system";
import type { AgreementInput } from "../schemas";

type AgreementProps = {
  onBack: () => void;
  onSubmit: () => void;
  onTestSubmit?: () => void;
  estimatedDeposit: number;
  showCaptchaField?: boolean;
};

type FormValues = {
  agreement: AgreementInput;
};

const stripeMethod: { id: AgreementInput["gateway"]; label: string; description: string } = {
  id: "stripe",
  label: "Credit or debit card",
  description: "Secure card deposit with instant confirmation through Stripe.",
};

export function AgreementAndPayment({
  onBack,
  onSubmit,
  onTestSubmit,
  estimatedDeposit,
  showCaptchaField = false,
}: AgreementProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormValues>();

  const selectedGateway = watch("agreement.gateway") ?? "stripe";
  const [isSubmitting, setSubmitting] = useState(false);
  const [testAcknowledged, setTestAcknowledged] = useState(false);

  useEffect(() => {
    if (selectedGateway !== "stripe") {
      setValue("agreement.gateway", "stripe");
    }
  }, [selectedGateway, setValue]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestSubmit = async () => {
    if (!onTestSubmit || !testAcknowledged) return;
    setSubmitting(true);
    try { await onTestSubmit(); } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Agreement</p>
          <h3 className="font-display text-3xl text-ink">{onTestSubmit ? "Complete your TEST request" : "Review and place your refundable deposit"}</h3>
          <p className="text-sm text-slate-500">
            {onTestSubmit ? "This test path does not charge a deposit or create a real reservation." : "Deposits are fully refundable if PixieDVC cannot match you with a qualifying owner inside the service window."}
          </p>
          {showCaptchaField ? (
            <div>
              <FieldLabel htmlFor="agreement.captchaToken">Security Check</FieldLabel>
              <TextArea
                id="agreement.captchaToken"
                rows={2}
                placeholder="reCAPTCHA token placeholder — wired in production"
                {...register("agreement.captchaToken")}
              />
            </div>
          ) : null}
        </div>

        {!onTestSubmit ? <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm">
            <h4 className="font-display text-2xl text-ink">Reservation Summary</h4>
            <p className="mt-2 text-sm text-slate-500">
              You are authorizing a ${estimatedDeposit.toFixed(2)} USD deposit. This is held securely and
              automatically released if no match is found.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <label className="flex items-center gap-3">
                <input type="checkbox" {...register("agreement.acceptTerms")} className="h-4 w-4" />
                I have reviewed the PixieDVC guest terms and understand the matching timeline.
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" {...register("agreement.authorizeDeposit")} className="h-4 w-4" />
                I authorize PixieDVC to place a refundable ${estimatedDeposit.toFixed(2)} USD deposit when I submit.
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <FieldLabel htmlFor="agreement.signedName">Type your full name to e-sign</FieldLabel>
            <TextInput
              id="agreement.signedName"
              aria-invalid={Boolean(errors.agreement?.signedName)}
              aria-describedby="agreement-signed-name-help"
              {...register("agreement.signedName", { required: true })}
            />
            <HelperText id="agreement-signed-name-help">
              {errors.agreement?.signedName ? "Please type your full name." : "We capture your IP address and timestamp when you submit."}
            </HelperText>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Deposit Method</p>
            <div className="rounded-2xl border border-brand/20 bg-brand/5 px-5 py-4">
              <p className="text-sm font-semibold text-ink">{stripeMethod.label}</p>
              <p className="mt-1 text-sm text-slate-500">{stripeMethod.description}</p>
            </div>
          </div>

        </div> : null}

        {!onTestSubmit && errors.agreement && !errors.agreement?.signedName ? (
          <HelperText>Accept the terms and complete card payment to continue.</HelperText>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button onClick={onBack} variant="ghost">
            Back
          </Button>
          {!onTestSubmit ? <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Submit & Place Deposit"}
          </Button> : null}
        </div>
        {onTestSubmit ? (
          <div className="mt-5 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-sm text-slate-800">
            <p className="font-semibold">TEST booking option</p>
            <p className="mt-1">This submits a test request without a charge, paid deposit, owner match, or confirmed booking.</p>
            <label className="mt-3 flex items-start gap-2">
              <input type="checkbox" checked={testAcknowledged} onChange={(event) => setTestAcknowledged(event.target.checked)} />
              I understand this is a test request and no reservation is confirmed.
            </label>
            <Button onClick={handleTestSubmit} disabled={isSubmitting || !testAcknowledged}>
              Complete Test Booking — No Charge
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
