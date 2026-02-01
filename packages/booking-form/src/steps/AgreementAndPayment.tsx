"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button, Card, FieldLabel, HelperText, TextArea, TextInput } from "@pixiedvc/design-system";
import type { AgreementInput } from "../schemas";

type AgreementProps = {
  onBack: () => void;
  onSubmit: () => void;
  estimatedDeposit: number;
};

type FormValues = {
  agreement: AgreementInput;
};

const gatewayTabs: { id: AgreementInput["gateway"]; label: string; description: string }[] = [
  { id: "stripe", label: "Stripe", description: "Secure card deposit with instant confirmation." },
  { id: "paypal", label: "PayPal", description: "Use your PayPal balance or linked account." },
];

export function AgreementAndPayment({ onBack, onSubmit, estimatedDeposit }: AgreementProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormValues>();

  const selectedGateway = watch("agreement.gateway") ?? "stripe";
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Agreement</p>
          <h3 className="font-display text-3xl text-ink">Review and place your refundable deposit</h3>
          <p className="text-sm text-slate-600">
            Deposits are fully refundable if PixieDVC cannot match you with a qualifying owner inside the
            service window.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm">
            <h4 className="font-display text-2xl text-ink">Reservation Summary</h4>
            <p className="mt-2 text-sm text-slate-600">
              You are authorizing a ${estimatedDeposit.toFixed(2)} USD deposit. This is held securely and
              automatically released if no match is found.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
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
            <div className="flex flex-wrap gap-3">
              {gatewayTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                    selectedGateway === tab.id
                      ? "border-brand bg-brand text-white shadow-[0_16px_40px_rgba(46,143,255,0.35)]"
                      : "border-slate-200 bg-white text-ink hover:border-brand"
                  }`}
                  onClick={() => setValue("agreement.gateway", tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              {gatewayTabs.find((tab) => tab.id === selectedGateway)?.description}
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="agreement.captchaToken">Security Check</FieldLabel>
            <TextArea
              id="agreement.captchaToken"
              rows={2}
              placeholder="reCAPTCHA token placeholder — wired in production"
              {...register("agreement.captchaToken")}
            />
          </div>
        </div>

        {errors.agreement && !errors.agreement?.signedName ? (
          <HelperText>Accept the terms and choose a payment method to continue.</HelperText>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button onClick={onBack} variant="ghost">
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Submit & Place Deposit"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
