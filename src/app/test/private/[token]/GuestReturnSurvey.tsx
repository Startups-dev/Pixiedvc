"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  token: string;
  submittedByEmail: string;
};

type FormState = {
  first_impression: string;
  what_is_unclear: string;
  understanding_easy_score: string;
  reservation_type_count_guess: string;
  reservation_type_difference_explained: string;
  reservation_type_clarity_score: string;
  booking_option_choice: string;
  booking_option_reason: string;
  found_stay: string;
  finding_stay_difficulty_reason: string;
  pricing_feel: string;
  login_necessity_feedback: string;
  login_hesitation_reason: string;
  completed_booking_or_request_flow: string;
  hesitation_point: string;
  almost_stopped_you: string;
  uncertain_point: string;
  trust_score: string;
  trust_increase_needs: string;
  preferred_payment_method: string;
  secondary_payment_method: string;
  payment_method_blocker: string;
  my_trips_awareness: string;
  my_trips_usefulness_score: string;
  my_trips_appeal_score: string;
  addon_interest: string[];
  most_likely_addon_purchase: string;
  offers_expected_timing: string;
  addons_increase_booking_likelihood: string;
  would_use_pixiedvc: string;
  would_use_reason: string;
  alternative_if_not_pixiedvc: string;
  biggest_confusion: string;
  favorite_part: string;
  design_pages_tools_feedback: string;
};

const DEFAULT_FORM: FormState = {
  first_impression: "",
  what_is_unclear: "",
  understanding_easy_score: "",
  reservation_type_count_guess: "",
  reservation_type_difference_explained: "",
  reservation_type_clarity_score: "",
  booking_option_choice: "",
  booking_option_reason: "",
  found_stay: "",
  finding_stay_difficulty_reason: "",
  pricing_feel: "",
  login_necessity_feedback: "",
  login_hesitation_reason: "",
  completed_booking_or_request_flow: "",
  hesitation_point: "",
  almost_stopped_you: "",
  uncertain_point: "",
  trust_score: "",
  trust_increase_needs: "",
  preferred_payment_method: "",
  secondary_payment_method: "",
  payment_method_blocker: "",
  my_trips_awareness: "",
  my_trips_usefulness_score: "",
  my_trips_appeal_score: "",
  addon_interest: [],
  most_likely_addon_purchase: "",
  offers_expected_timing: "",
  addons_increase_booking_likelihood: "",
  would_use_pixiedvc: "",
  would_use_reason: "",
  alternative_if_not_pixiedvc: "",
  biggest_confusion: "",
  favorite_part: "",
  design_pages_tools_feedback: "",
};

const ADDON_OPTIONS = [
  ["dining_plan", "Dining plan"],
  ["park_tickets", "Park tickets"],
  ["grocery_delivery", "Grocery delivery"],
  ["cleaning_service", "Cleaning service"],
  ["private_chef", "Private chef"],
  ["butler", "Butler"],
  ["massage", "Massage"],
  ["personal_trainer", "Personal trainer"],
  ["concierge_planning", "Concierge planning"],
] as const;

function StepRating({
  name,
  label,
  min,
  max,
  value,
  onChange,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: max - min + 1 }, (_, idx) => {
          const score = String(min + idx);
          const active = value === score;
          return (
            <button
              key={`${name}-${score}`}
              type="button"
              onClick={() => onChange(score)}
              className={`h-12 rounded-xl border text-base font-semibold ${
                active
                  ? "border-[#0F2148] bg-[#0F2148] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSelectButtons({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(([optionValue, optionLabel]) => {
          const active = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                active
                  ? "border-[#0F2148] bg-[#0F2148] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTextArea({
  label,
  value,
  required,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
        required={required}
      />
    </label>
  );
}

export default function GuestReturnSurvey({ token, submittedByEmail }: Props) {
  const storageKey = useMemo(() => `pixiedvc-guest-survey:${token}`, [token]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const totalSteps = 8;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { step?: number; form?: Partial<FormState> };
      if (parsed.form) {
        setForm((prev) => ({ ...prev, ...parsed.form, addon_interest: Array.isArray(parsed.form.addon_interest) ? parsed.form.addon_interest : prev.addon_interest }));
      }
      if (parsed.step && parsed.step >= 1 && parsed.step <= totalSteps) {
        setStep(parsed.step);
      }
    } catch {
      // ignore invalid local cache
    }
  }, [storageKey]);

  useEffect(() => {
    const payload = JSON.stringify({ step, form });
    window.localStorage.setItem(storageKey, payload);
  }, [step, form, storageKey]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAddon(value: string) {
    setForm((prev) => {
      const has = prev.addon_interest.includes(value);
      return {
        ...prev,
        addon_interest: has ? prev.addon_interest.filter((item) => item !== value) : [...prev.addon_interest, value],
      };
    });
  }

  function validateStep(stepNumber: number) {
    if (stepNumber === 1) return Boolean(form.first_impression && form.what_is_unclear && form.understanding_easy_score);
    if (stepNumber === 2)
      return Boolean(form.reservation_type_count_guess && form.reservation_type_difference_explained && form.reservation_type_clarity_score);
    if (stepNumber === 3) return Boolean(form.booking_option_choice && form.booking_option_reason);
    if (stepNumber === 4) return Boolean(form.found_stay && form.finding_stay_difficulty_reason && form.pricing_feel);
    if (stepNumber === 5) {
      if (!form.completed_booking_or_request_flow) return false;
      if (form.completed_booking_or_request_flow === "yes") return true;
      return Boolean(form.hesitation_point && form.almost_stopped_you);
    }
    if (stepNumber === 6) return Boolean(form.uncertain_point && form.trust_score && form.trust_increase_needs);
    if (stepNumber === 7)
      return Boolean(
        form.preferred_payment_method &&
          form.payment_method_blocker &&
          form.most_likely_addon_purchase &&
          form.offers_expected_timing &&
          form.addons_increase_booking_likelihood,
      );
    if (stepNumber === 8)
      return Boolean(
        form.my_trips_awareness &&
          (form.my_trips_awareness === "no"
            ? form.my_trips_appeal_score
            : form.my_trips_usefulness_score && form.my_trips_appeal_score) &&
          form.would_use_pixiedvc &&
          form.would_use_reason &&
          form.alternative_if_not_pixiedvc &&
          form.biggest_confusion &&
          form.favorite_part,
      );
    return false;
  }

  const canContinue = validateStep(step);
  const progressPercent = (step / totalSteps) * 100;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">Guest Experience Test</h2>
      <p className="mt-2 text-sm text-slate-600">
        Share your experience as you go. When finished, submit your responses.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[#0F2148] transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <form
        action="/api/testing/survey"
        method="post"
        className="mt-6 space-y-4"
        onSubmit={() => {
          window.localStorage.removeItem(storageKey);
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="submitted_by_email" value={submittedByEmail} />

        {step === 1 ? (
          <div className="space-y-4">
            <StepTextArea label="First impression: what do you think this platform does?" value={form.first_impression} onChange={(v) => updateField("first_impression", v)} required />
            <StepTextArea label="What is unclear?" value={form.what_is_unclear} onChange={(v) => updateField("what_is_unclear", v)} required />
            <StepRating name="understanding_easy_score" label="How easy was it to understand? (1-5, where 1 is very hard to understand and 5 is very easy to understand)" min={1} max={5} value={form.understanding_easy_score} onChange={(v) => updateField("understanding_easy_score", v)} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">How many reservation types do you think exist?</span>
              <input value={form.reservation_type_count_guess} onChange={(e) => updateField("reservation_type_count_guess", e.target.value)} name="reservation_type_count_guess" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm" required />
            </label>
            <StepTextArea label="Explain the difference between them" value={form.reservation_type_difference_explained} onChange={(v) => updateField("reservation_type_difference_explained", v)} required />
            <StepRating name="reservation_type_clarity_score" label="How clear is the difference? (1-5, where 1 is very unclear and 5 is very clear)" min={1} max={5} value={form.reservation_type_clarity_score} onChange={(v) => updateField("reservation_type_clarity_score", v)} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <StepSelectButtons label="Which option would you choose?" value={form.booking_option_choice} options={[["ReadyStays", "ReadyStays"], ["Request Booking", "Request Booking"], ["Not sure", "Not sure"]]} onChange={(v) => updateField("booking_option_choice", v)} />
            <StepTextArea label="Why did you choose that option?" value={form.booking_option_reason} onChange={(v) => updateField("booking_option_reason", v)} required />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <StepSelectButtons label="Were you able to find a stay?" value={form.found_stay} options={[["yes", "Yes"], ["partially", "Partially"], ["no", "No"]]} onChange={(v) => updateField("found_stay", v)} />
            <StepTextArea label="What made this easy or difficult?" value={form.finding_stay_difficulty_reason} onChange={(v) => updateField("finding_stay_difficulty_reason", v)} required />
            <StepSelectButtons label="How did pricing feel?" value={form.pricing_feel} options={[["cheaper_than_expected", "Cheaper than expected"], ["fair", "Fair"], ["expensive", "Expensive"], ["confusing", "Confusing"]]} onChange={(v) => updateField("pricing_feel", v)} />
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <StepTextArea label="If you were asked to log in or create an account, did it feel like the right moment?" value={form.login_necessity_feedback} onChange={(v) => updateField("login_necessity_feedback", v)} />
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">What made you hesitate?</span>
              <textarea
                value={form.login_hesitation_reason}
                onChange={(event) => updateField("login_hesitation_reason", event.target.value)}
                rows={3}
                placeholder="(Leave blank if nothing)"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
              />
            </label>
            <StepSelectButtons label="Were you able to complete the booking/request flow?" value={form.completed_booking_or_request_flow} options={[["yes", "Yes"], ["partially", "Partially"], ["no", "No"]]} onChange={(v) => updateField("completed_booking_or_request_flow", v)} />
            {form.completed_booking_or_request_flow !== "yes" ? (
              <>
                <StepTextArea label="Where did you hesitate or feel unsure?" value={form.hesitation_point} onChange={(v) => updateField("hesitation_point", v)} required />
                <StepTextArea label="What almost stopped you?" value={form.almost_stopped_you} onChange={(v) => updateField("almost_stopped_you", v)} required />
              </>
            ) : null}
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-4">
            <StepTextArea label="At what point did you feel uncertain or hesitant?" value={form.uncertain_point} onChange={(v) => updateField("uncertain_point", v)} required />
            <StepRating name="trust_score" label="How much do you trust this platform? (1-10)" min={1} max={10} value={form.trust_score} onChange={(v) => updateField("trust_score", v)} />
            <StepTextArea label="What would increase your trust?" value={form.trust_increase_needs} onChange={(v) => updateField("trust_increase_needs", v)} required />
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <StepSelectButtons label="Which payment method would you feel most comfortable using?" value={form.preferred_payment_method} options={[["credit_card", "Credit card"], ["paypal", "PayPal"], ["bank_transfer_or_e_transfer", "Bank transfer / e-transfer"], ["crypto", "Crypto"], ["other", "Other"]]} onChange={(v) => updateField("preferred_payment_method", v)} />
            <StepSelectButtons label="Which other payment method would you also be comfortable using?" value={form.secondary_payment_method} options={[["", "None"], ["credit_card", "Credit card"], ["paypal", "PayPal"], ["bank_transfer_or_e_transfer", "Bank transfer / e-transfer"], ["crypto", "Crypto"], ["other", "Other"]]} onChange={(v) => updateField("secondary_payment_method", v)} />
            <StepSelectButtons label="Would the lack of your preferred payment method stop you from using the platform?" value={form.payment_method_blocker} options={[["yes", "Yes"], ["no", "No"], ["maybe", "Maybe"]]} onChange={(v) => updateField("payment_method_blocker", v)} />
            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-700">Which add-ons would you realistically consider using? (multi-select)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ADDON_OPTIONS.map(([value, label]) => {
                  const checked = form.addon_interest.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleAddon(value)}
                      className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                        checked
                          ? "border-[#0F2148] bg-[#0F2148] text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <StepTextArea label="Which ONE would you most likely purchase?" value={form.most_likely_addon_purchase} onChange={(v) => updateField("most_likely_addon_purchase", v)} required />
            <StepSelectButtons label="When would you expect to see these offers?" value={form.offers_expected_timing} options={[["before_booking", "Before booking"], ["during_checkout", "During checkout"], ["after_booking", "After booking"], ["does_not_matter", "Does not matter"]]} onChange={(v) => updateField("offers_expected_timing", v)} />
            <StepSelectButtons label="Would these services make you more likely to book through the platform?" value={form.addons_increase_booking_likelihood} options={[["yes", "Yes"], ["no", "No"], ["maybe", "Maybe"]]} onChange={(v) => updateField("addons_increase_booking_likelihood", v)} />
          </div>
        ) : null}

        {step === 8 ? (
          <div className="space-y-4">
            <StepSelectButtons
              label="Did you notice or understand the ‘My Trips’ section?"
              value={form.my_trips_awareness}
              options={[
                ["yes_clear", "Yes, clearly"],
                ["yes_partial", "Yes, partially"],
                ["no", "No"],
              ]}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  my_trips_awareness: v,
                  ...(v === "no" ? { my_trips_usefulness_score: "" } : {}),
                }))
              }
            />
            {form.my_trips_awareness === "yes_clear" || form.my_trips_awareness === "yes_partial" ? (
              <>
                <StepRating name="my_trips_usefulness_score" label="How useful does My Trips feel? (1-5, where 1 is not useful at all and 5 is very useful)" min={1} max={5} value={form.my_trips_usefulness_score} onChange={(v) => updateField("my_trips_usefulness_score", v)} />
                <StepRating name="my_trips_appeal_score" label="How appealing is it? (1-5, where 1 is not appealing at all and 5 is very appealing)" min={1} max={5} value={form.my_trips_appeal_score} onChange={(v) => updateField("my_trips_appeal_score", v)} />
              </>
            ) : null}
            {form.my_trips_awareness === "no" ? (
              <StepRating name="my_trips_appeal_score" label="Based on the idea of having a dashboard with your reservation, how appealing would that be? (1-5, where 1 is not appealing at all and 5 is very appealing)" min={1} max={5} value={form.my_trips_appeal_score} onChange={(v) => updateField("my_trips_appeal_score", v)} />
            ) : null}
            <StepSelectButtons label="Would you actually use PixieDVC?" value={form.would_use_pixiedvc} options={[["yes", "Yes"], ["no", "No"], ["maybe", "Maybe"]]} onChange={(v) => updateField("would_use_pixiedvc", v)} />
            <StepTextArea label="Why?" value={form.would_use_reason} onChange={(v) => updateField("would_use_reason", v)} required />
            <StepTextArea label="If PixieDVC did not exist, what would you do instead?" value={form.alternative_if_not_pixiedvc} onChange={(v) => updateField("alternative_if_not_pixiedvc", v)} required />
            <StepTextArea label="What confused you the most?" value={form.biggest_confusion} onChange={(v) => updateField("biggest_confusion", v)} required />
            <StepTextArea label="What did you like most?" value={form.favorite_part} onChange={(v) => updateField("favorite_part", v)} required />
            <StepTextArea label="Is there anything about the design, pages, or tools (like the calculator) that stood out to you?" value={form.design_pages_tools_feedback} onChange={(v) => updateField("design_pages_tools_feedback", v)} />
          </div>
        ) : null}

        {Object.entries(form)
          .filter(([key]) => key !== "addon_interest")
          .map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ))}

        {form.addon_interest.map((value) => (
          <input key={`addon_interest:${value}`} type="hidden" name="addon_interest" value={value} />
        ))}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="min-h-12 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Back
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
              disabled={!canContinue}
              className="min-h-12 rounded-xl bg-[#0F2148] px-6 py-2.5 text-sm font-semibold !text-white shadow-sm disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canContinue}
              className="min-h-12 rounded-xl bg-[#0F2148] px-5 py-2.5 text-sm font-semibold !text-white disabled:opacity-50"
            >
              Submit survey
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
