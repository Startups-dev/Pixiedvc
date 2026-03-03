"use client";

import { useState } from "react";

type Submission = {
  id: string;
  created_at: string;
  quote: string;
  author: string;
  location: string;
  email?: string | null;
  admin_notes?: string | null;
};

type Props = {
  initial: Submission[];
};

export default function AdminTestimonialsClient({ initial }: Props) {
  const [submissions, setSubmissions] = useState(initial);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  async function handleAction(id: string, action: "approve" | "reject") {
    setStatus((prev) => ({ ...prev, [id]: "saving" }));
    const admin_notes = notes[id] ?? "";
    const response = await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, action, admin_notes }),
    });

    if (!response.ok) {
      setStatus((prev) => ({ ...prev, [id]: "error" }));
      return;
    }

    setStatus((prev) => ({ ...prev, [id]: "done" }));
    setSubmissions((prev) => prev.filter((item) => item.id !== id));
  }

  if (submissions.length === 0) {
    return <p className="text-sm text-[#8e8ea0]">No pending testimonials.</p>;
  }

  return (
    <div className="space-y-6">
      {submissions.map((submission) => {
        const noteValue = notes[submission.id] ?? "";
        return (
          <div
            key={submission.id}
            className="rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-[#8e8ea0]">
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>
                <p className="mt-3 text-base text-[#ececec]">“{submission.quote}”</p>
                <p className="mt-3 text-sm text-[#b4b4b4]">
                  {submission.author} · {submission.location}
                </p>
                {submission.email ? (
                  <p className="mt-1 text-xs text-[#8e8ea0]">{submission.email}</p>
                ) : null}
              </div>

              <div className="w-full max-w-xs space-y-3">
                <label className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
                  Admin notes
                </label>
                <textarea
                  value={noteValue}
                  onChange={(event) =>
                    setNotes((prev) => ({ ...prev, [submission.id]: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm text-[#ececec] placeholder:text-[#8e8ea0]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(submission.id, "approve")}
                    className="rounded-full bg-[#10a37f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0d8c6d]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(submission.id, "reject")}
                    className="rounded-full border border-[#3a3a3a] bg-[#212121] px-4 py-2 text-xs font-semibold text-[#ececec] transition hover:bg-[#171717]"
                  >
                    Reject
                  </button>
                </div>
                {status[submission.id] === "error" ? (
                  <p className="text-xs text-[#ff6b6b]">Update failed. Try again.</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
