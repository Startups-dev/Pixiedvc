export default function OwnerRentalsLoading() {
  return (
    <div className="space-y-8" aria-label="Loading reservations">
      <div className="space-y-3">
        <div className="h-3 w-36 rounded-full bg-[#ECECE8]" />
        <div className="h-10 w-56 rounded-full bg-[#ECECE8]" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-[#ECECE8]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-10 w-28 rounded-full bg-[#ECECE8]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-56 rounded-[18px] border border-[#E7E7E4] bg-white" />
        ))}
      </div>
    </div>
  );
}
