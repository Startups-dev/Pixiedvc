'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type QuickLink = {
  id: string;
  title: string;
  description: string;
  href?: string;
};

type QuickLinkSection = {
  title: string;
  links: QuickLink[];
};

const RECENT_KEY = 'pixiedvc.admin.recent';

const SECTIONS: QuickLinkSection[] = [
  {
    title: 'Operations',
    links: [
      {
        id: 'matching',
        title: 'Matching Queue',
        description: 'Review and manage active matches.',
        href: '/admin/matching',
      },
      {
        id: 'requests',
        title: 'Guest Requests',
        description: 'Review and promote guest requests.',
        href: '/admin/guests',
      },
      {
        id: 'owners',
        title: 'Owners',
        description: 'Manage owner profiles and inventory.',
        href: '/admin/owners',
      },
      {
        id: 'owner-verifications',
        title: 'Owner Verifications',
        description: 'Review and approve owner verification flows.',
        href: '/admin/owners/verifications',
      },
      {
        id: 'guests',
        title: 'Guests',
        description: 'Track guest submissions and statuses.',
        href: '/admin/guests',
      },
      {
        id: 'rentals',
        title: 'Rentals',
        description: 'Review live rentals and milestones.',
        href: '/admin/rentals',
      },
    ],
  },
  {
    title: 'Finance / Reports',
    links: [
      {
        id: 'ledger',
        title: 'Finance Ledger',
        description: 'Aggregate payments, splits, and totals.',
        href: '/admin/reports/ledger',
      },
      {
        id: 'affiliate-payouts',
        title: 'Affiliates / Payouts',
        description: 'Review affiliate payouts and status.',
        href: '/admin/affiliates/payouts',
      },
      {
        id: 'payouts',
        title: 'Owner Payouts',
        description: 'Track owner payout timing and status.',
        href: '/admin/payouts',
      },
      {
        id: 'transactions',
        title: 'Transactions',
        description: 'Detailed payment transaction log.',
      },
    ],
  },
  {
    title: 'Content / SEO',
    links: [
      {
        id: 'testimonials',
        title: 'Testimonials',
        description: 'Approve and manage testimonials.',
        href: '/admin/testimonials',
      },
      {
        id: 'resort-photos',
        title: 'Resort Photos',
        description: 'Manage resort media and galleries.',
        href: '/admin/tools/resort-photos',
      },
      {
        id: 'content',
        title: 'Guides / Content Admin',
        description: 'Manage blog, guides, and SEO content.',
      },
      {
        id: 'resorts',
        title: 'Resorts Admin',
        description: 'Edit resorts and availability data.',
      },
    ],
  },
  {
    title: 'System',
    links: [
      {
        id: 'promotions',
        title: 'Promotions',
        description: 'Control enrollment switches for guest and owner perks.',
        href: '/admin/promotions',
      },
      {
        id: 'compliance',
        title: 'Compliance',
        description: 'SOC readiness, audit log, access reviews, incidents, vendors & policies.',
        href: '/admin/compliance',
      },
      {
        id: 'audit',
        title: 'Audit Log',
        description: 'View admin audit trail events.',
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'System-wide configuration settings.',
      },
      {
        id: 'inventory',
        title: 'Private Inventory',
        description: 'Manage private inventory listings.',
        href: '/admin/private-inventory',
      },
    ],
  },
];

function loadRecent(): QuickLink[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickLink[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item.href);
  } catch {
    return [];
  }
}

function saveRecent(next: QuickLink[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, 3)));
  } catch {
    // ignore
  }
}

export default function QuickLinksPanel() {
  const [recentLinks, setRecentLinks] = useState<QuickLink[]>([]);

  useEffect(() => {
    setRecentLinks(loadRecent());
  }, []);

  const activeSections = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      links: section.links.filter((link) => link.href || link.description),
    }));
  }, []);

  function handleRecent(link: QuickLink) {
    if (!link.href) return;
    const next = [link, ...recentLinks.filter((item) => item.href !== link.href)];
    setRecentLinks(next.slice(0, 3));
    saveRecent(next);
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quick Links</p>
        <h2 className="text-xl font-semibold text-slate-900">Admin Console</h2>
        <p className="text-sm text-slate-500">
          Jump directly to the most-used admin workspaces.
        </p>
      </div>

      {recentLinks.length ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recently used</p>
          <div className="flex flex-wrap gap-2">
            {recentLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href ?? '#'}
                onClick={() => handleRecent(link)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-800"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {activeSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {section.title}
            </p>
            <div className="grid gap-3">
              {section.links.map((link) => {
                if (link.href) {
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      onClick={() => handleRecent(link)}
                      className="group rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{link.title}</p>
                          <p className="text-xs text-slate-500">{link.description}</p>
                        </div>
                        <span className="text-xs text-slate-400 transition group-hover:text-slate-600">
                          Open →
                        </span>
                      </div>
                    </Link>
                  );
                }
                return (
                  <div
                    key={link.id}
                    className="rounded-2xl border border-dashed border-slate-200 p-4 text-left text-slate-400"
                  >
                    <p className="text-sm font-semibold text-slate-500">{link.title}</p>
                    <p className="text-xs text-slate-400">{link.description}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Coming soon
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
