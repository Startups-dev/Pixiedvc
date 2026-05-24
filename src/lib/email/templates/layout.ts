const DISCLAIMER =
  'PixieDVC is an independent vacation rental platform and is not affiliated with, sponsored by, or endorsed by The Walt Disney Company or Disney Vacation Club.';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textLine(label: string, value: string | null | undefined) {
  return `${label}: ${value && value.trim() ? value.trim() : '—'}`;
}

export function renderTextList(items: Array<string | null | undefined>) {
  return items.filter((item): item is string => Boolean(item && item.trim())).map((item) => `• ${item}`).join('\n');
}

type EmailLayoutOptions = {
  title: string;
  intro?: string | null;
  sections: Array<{
    title?: string | null;
    lines?: Array<string | null | undefined>;
    html?: string | null;
  }>;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  footerNote?: string | null;
};

export function renderEmailLayout({
  title,
  intro,
  sections,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailLayoutOptions) {
  const sectionHtml = sections
    .map((section) => {
      const heading = section.title
        ? `<h2 style="margin:0 0 12px;font-size:14px;line-height:1.4;font-weight:700;color:#102542;">${escapeHtml(section.title)}</h2>`
        : '';
      const lines = (section.lines ?? [])
        .filter((line): line is string => Boolean(line && line.trim()))
        .map(
          (line) =>
            `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#31445b;">${escapeHtml(line)}</p>`,
        )
        .join('');
      const html = section.html ?? '';

      if (!heading && !lines && !html) return '';

      return `<div style="margin:0 0 24px;">${heading}${lines}${html}</div>`;
    })
    .join('');

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<div style="margin:0 0 28px;"><a href="${escapeHtml(
          ctaUrl,
        )}" style="display:inline-block;border-radius:999px;background:#163566;color:#ffffff;text-decoration:none;padding:14px 22px;font-size:14px;font-weight:700;">${escapeHtml(
          ctaLabel,
        )}</a></div>`
      : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charSet="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body style="margin:0;padding:0;background:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#102542;">',
    '<div style="width:100%;background:#f3f6fb;padding:32px 16px;">',
    '<div style="max-width:640px;margin:0 auto;">',
    '<div style="margin:0 0 18px;text-align:center;font-size:18px;line-height:1.2;font-weight:700;letter-spacing:0.08em;color:#163566;text-transform:uppercase;">PixieDVC</div>',
    '<div style="background:#ffffff;border:1px solid #dbe4f0;border-radius:20px;padding:32px 28px;box-shadow:0 12px 32px rgba(16,37,66,0.08);">',
    `<h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;font-weight:700;color:#102542;">${escapeHtml(title)}</h1>`,
    intro
      ? `<p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#31445b;">${escapeHtml(intro)}</p>`
      : '',
    sectionHtml,
    ctaHtml,
    `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#63758c;">${escapeHtml(
      footerNote ?? DISCLAIMER,
    )}</p>`,
    '</div>',
    '</div>',
    '</div>',
    '</body>',
    '</html>',
  ].join('');
}
