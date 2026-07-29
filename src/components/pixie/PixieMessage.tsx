import type { PixieClientMessage } from "@/lib/pixie/client/types";

export default function PixieMessage({ message }: { message: PixieClientMessage }) {
  const isUser = message.role === "user";
  const isStatus = message.role === "status";
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-[#0f2148] text-white"
            : isStatus
              ? "border border-slate-200 bg-slate-50 text-slate-600"
              : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {!isUser && !isStatus ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hara</p> : null}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </article>
  );
}
