import Link from "next/link";

type OwnerFilterTab = {
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

export default function OwnerFilterTabs({ tabs, label = "Filter records" }: { tabs: OwnerFilterTab[]; label?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
            tab.active
              ? "border-[#10224A] bg-[#10224A] text-white"
              : "border-[#E7E7E4] bg-white text-[#667085] hover:border-[#D8D8D2] hover:text-[#10224A]"
          }`}
        >
          <span className={tab.active ? "!text-white" : undefined}>{tab.label}</span>
          {typeof tab.count === "number" ? (
            <span className={`ml-2 text-xs opacity-75 ${tab.active ? "!text-white" : ""}`}>{tab.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
