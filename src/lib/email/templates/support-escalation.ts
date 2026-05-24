import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type SupportEscalationTemplateInput = {
  conversationId: string;
  name?: string | null;
  email?: string | null;
  message?: string | null;
  pageUrl?: string | null;
};

export function buildSupportEscalationTemplate({
  conversationId,
  name,
  email,
  message,
  pageUrl,
}: SupportEscalationTemplateInput) {
  const subject = 'Support case escalated for concierge follow-up';

  const text = [
    'A support conversation has been escalated.',
    '',
    textLine('Conversation ID', conversationId),
    textLine('Guest', name),
    textLine('Email', email),
    textLine('Page', pageUrl),
    '',
    'Latest message:',
    message?.trim() || '—',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Support case escalated',
    intro: 'A guest conversation has been escalated for concierge follow-up.',
    sections: [
      {
        title: 'Case details',
        lines: [
          textLine('Conversation ID', conversationId),
          textLine('Guest', name),
          textLine('Email', email),
          textLine('Page', pageUrl),
        ],
      },
      {
        title: 'Latest message',
        lines: [message?.trim() || '—'],
      },
    ],
  });

  return { subject, text, html };
}
