export default function OwnerMembershipsLoading() {
  return (
    <div className="space-y-8" aria-label="Loading memberships">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded-full bg-[#ECECE8]" />
        <div className="h-10 w-64 rounded-full bg-[#ECECE8]" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-[#ECECE8]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-80 rounded-[18px] border border-[#E7E7E4] bg-white" />
        ))}
      </div>
    </div>
  );
}
