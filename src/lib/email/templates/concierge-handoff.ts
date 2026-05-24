import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ConciergeHandoffTemplateInput = {
  conversationId: string;
  name?: string | null;
  email?: string | null;
  message?: string | null;
  pageUrl?: string | null;
};

export function buildConciergeHandoffTemplate({
  conversationId,
  name,
  email,
  message,
  pageUrl,
}: ConciergeHandoffTemplateInput) {
  const subject = 'New concierge follow-up request';

  const text = [
    'A guest requested concierge follow-up.',
    '',
    textLine('Conversation ID', conversationId),
    textLine('Guest', name),
    textLine('Email', email),
    textLine('Page', pageUrl),
    '',
    'Message:',
    message?.trim() || '—',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Concierge follow-up requested',
    intro: 'A guest has been handed off for personal concierge follow-up.',
    sections: [
      {
        title: 'Guest details',
        lines: [
          textLine('Conversation ID', conversationId),
          textLine('Guest', name),
          textLine('Email', email),
          textLine('Page', pageUrl),
        ],
      },
      {
        title: 'Message',
        lines: [message?.trim() || '—'],
      },
    ],
  });

  return { subject, text, html };
}
