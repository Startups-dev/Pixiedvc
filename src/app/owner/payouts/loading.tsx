export default function OwnerPayoutsLoading() {
  return (
    <div className="space-y-8" aria-label="Loading payouts">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded-full bg-[#ECECE8]" />
        <div className="h-10 w-48 rounded-full bg-[#ECECE8]" />
        <div className="h-4 w-full max-w-xl rounded-full bg-[#ECECE8]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-32 rounded-[18px] border border-[#E7E7E4] bg-white" />
        ))}
      </div>
      <div className="h-72 rounded-[18px] border border-[#E7E7E4] bg-white" />
    </div>
  );
}
