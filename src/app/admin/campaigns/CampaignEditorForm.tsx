'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState } from 'react';

import {
  INITIAL_NEWSLETTER_CAMPAIGN_EDITOR_STATE,
  NEWSLETTER_CAMPAIGN_AUDIENCE_OPTIONS,
  type NewsletterCampaignEditorState,
  type NewsletterCampaignEditorValues,
} from '@/lib/newsletter-campaigns';

type Props = {
  mode: 'create' | 'edit';
  initialValues: NewsletterCampaignEditorValues;
  initialPreview: {
    html: string;
    text: string;
  };
  action: (
    prevState: NewsletterCampaignEditorState,
    formData: FormData,
  ) => Promise<NewsletterCampaignEditorState>;
  readOnly?: boolean;
};

export function CampaignEditorForm({ mode, initialValues, initialPreview, action, readOnly = false }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, INITIAL_NEWSLETTER_CAMPAIGN_EDITOR_STATE);
  const currentValues = state.values ?? initialValues;
  const [sections, setSections] = useState(
    currentValues.bodySections.length ? currentValues.bodySections : [{ title: '', content: '' }],
  );

  useEffect(() => {
    if (mode === 'create' && state.status === 'created' && state.campaignId) {
      router.replace(`/admin/campaigns/${state.campaignId}?created=1`);
    }
  }, [mode, router, state.campaignId, state.status]);

  useEffect(() => {
    setSections(currentValues.bodySections.length ? currentValues.bodySections : [{ title: '', content: '' }]);
  }, [currentValues.bodySections]);

  const preview = useMemo(
    () => ({
      html: state.previewHtml ?? initialPreview.html,
      text: state.previewText ?? initialPreview.text,
    }),
    [initialPreview.html, initialPreview.text, state.previewHtml, state.previewText],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <form action={formAction} className="space-y-6 rounded-3xl border border-[#3a3a3a] bg-[#2a2a2a] p-6">
        {mode === 'edit' ? <input type="hidden" name="campaignId" value={initialValues.id ?? ''} /> : null}

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[#ececec]">{mode === 'create' ? 'Create draft campaign' : 'Edit draft campaign'}</h2>
          <p className="text-sm text-[#b4b4b4]">Save the draft to refresh the rendered preview.</p>
        </div>

        {state.message ? (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              state.status === 'error'
                ? 'border-rose-500/30 bg-rose-500/12 text-rose-200'
                : 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200'
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Internal name" error={state.fieldErrors?.name}>
            <input
              name="name"
              type="text"
              key={`name:${currentValues.name}`}
              defaultValue={currentValues.name}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>

          <Field label="Audience" error={state.fieldErrors?.audience}>
            <select
              name="audience"
              key={`audience:${currentValues.audience}`}
              defaultValue={currentValues.audience}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            >
              {NEWSLETTER_CAMPAIGN_AUDIENCE_OPTIONS.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Subject" error={state.fieldErrors?.subject}>
          <input
            name="subject"
            type="text"
            key={`subject:${currentValues.subject}`}
            defaultValue={currentValues.subject}
            disabled={readOnly || pending}
            className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            required
          />
        </Field>

        <Field label="Preview text" error={state.fieldErrors?.previewText}>
          <input
            name="previewText"
            type="text"
            key={`preview:${currentValues.previewText}`}
            defaultValue={currentValues.previewText}
            disabled={readOnly || pending}
            className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hero image URL" error={state.fieldErrors?.heroImageUrl}>
            <input
              name="heroImageUrl"
              type="url"
              key={`hero:${currentValues.heroImageUrl}`}
              defaultValue={currentValues.heroImageUrl}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>

          <Field label="Featured resort">
            <input
              name="featuredResort"
              type="text"
              key={`resort:${currentValues.featuredResort}`}
              defaultValue={currentValues.featuredResort}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#ececec]">Body sections</p>
              {state.fieldErrors?.bodySections ? <p className="mt-1 text-xs text-rose-300">{state.fieldErrors.bodySections}</p> : null}
            </div>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => setSections((current) => [...current, { title: '', content: '' }])}
                className="rounded-xl border border-[#4a4a4a] bg-[#252525] px-3 py-2 text-xs font-semibold text-[#ececec]"
              >
                Add section
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={`${index}:${section.title ?? ''}:${section.content ?? ''}`} className="rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Section {index + 1}</p>
                  {!readOnly && sections.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setSections((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-xs font-medium text-rose-300"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <input
                    name="sectionTitle"
                    type="text"
                    key={`section-title:${index}:${section.title ?? ''}`}
                    defaultValue={section.title ?? ''}
                    disabled={readOnly || pending}
                    className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
                    placeholder="Section title"
                  />
                  <textarea
                    name="sectionContent"
                    key={`section-content:${index}:${section.content ?? ''}`}
                    defaultValue={section.content ?? ''}
                    disabled={readOnly || pending}
                    rows={5}
                    className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
                    placeholder="Section content"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Primary CTA label" error={state.fieldErrors?.primaryCta}>
            <input
              name="primaryCtaLabel"
              type="text"
              key={`primary-label:${currentValues.primaryCtaLabel}`}
              defaultValue={currentValues.primaryCtaLabel}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>

          <Field label="Primary CTA URL" error={state.fieldErrors?.primaryCta}>
            <input
              name="primaryCtaUrl"
              type="url"
              key={`primary-url:${currentValues.primaryCtaUrl}`}
              defaultValue={currentValues.primaryCtaUrl}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Secondary CTA label" error={state.fieldErrors?.secondaryCta}>
            <input
              name="secondaryCtaLabel"
              type="text"
              key={`secondary-label:${currentValues.secondaryCtaLabel}`}
              defaultValue={currentValues.secondaryCtaLabel}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>

          <Field label="Secondary CTA URL" error={state.fieldErrors?.secondaryCta}>
            <input
              name="secondaryCtaUrl"
              type="url"
              key={`secondary-url:${currentValues.secondaryCtaUrl}`}
              defaultValue={currentValues.secondaryCtaUrl}
              disabled={readOnly || pending}
              className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
            />
          </Field>
        </div>

        <Field label="Footer note">
          <textarea
            name="footerNote"
            key={`footer:${currentValues.footerNote}`}
            defaultValue={currentValues.footerNote}
            disabled={readOnly || pending}
            rows={4}
            className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
          />
        </Field>

        {!readOnly ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#64748b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7b8aa0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving...' : mode === 'create' ? 'Create draft' : 'Save draft'}
          </button>
        ) : null}
      </form>

      <div className="space-y-6">
        <section className="rounded-3xl border border-[#3a3a3a] bg-[#2a2a2a] p-6">
          <h2 className="text-xl font-semibold text-[#ececec]">HTML preview</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#3a3a3a] bg-white">
            <iframe title="Campaign HTML preview" srcDoc={preview.html} className="h-[820px] w-full bg-white" />
          </div>
        </section>

        <section className="rounded-3xl border border-[#3a3a3a] bg-[#2a2a2a] p-6">
          <h2 className="text-xl font-semibold text-[#ececec]">Text preview</h2>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4 text-xs leading-6 text-[#d7d7d7]">
            {preview.text}
          </pre>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-[#ececec]">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}
