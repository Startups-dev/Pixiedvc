import type { ReactNode } from "react";

type OwnerDashboardEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  body: string;
};

export default function OwnerDashboardEmptyState({ icon, title, body }: OwnerDashboardEmptyStateProps) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
      {icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#E7E7E4] text-[#B99545]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[#10224A]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#667085]">{body}</p>
    </div>
  );
}
