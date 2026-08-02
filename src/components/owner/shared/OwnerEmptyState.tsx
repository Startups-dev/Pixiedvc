import type { ReactNode } from "react";

type OwnerEmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export default function OwnerEmptyState({ title, body, action }: OwnerEmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-[18px] border border-[#E7E7E4] bg-white px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-[#10224A]">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
