import { NextResponse } from 'next/server';

export function renderMatchResponse({ title, message, status }: { title: string; message: string; status: number }) {
  const ownerPortalUrl = '/owner';
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; line-height: 1.6; }
      .card { max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
      h1 { color: #0f172a; font-size: 1.75rem; margin-bottom: 12px; }
      p { color: #334155; }
      a { color: #0ea5e9; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <p><a href="${ownerPortalUrl}">Return to PixieDVC owner portal</a></p>
    </div>
  </body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
