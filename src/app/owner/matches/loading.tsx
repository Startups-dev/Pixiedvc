export default function OwnerMatchesLoading() {
  return (
    <div className="space-y-8" aria-label="Loading matches">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded-full bg-[#ECECE8]" />
        <div className="h-10 w-52 rounded-full bg-[#ECECE8]" />
        <div className="h-4 w-full max-w-xl rounded-full bg-[#ECECE8]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-10 w-32 rounded-full bg-[#ECECE8]" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-44 rounded-[18px] border border-[#E7E7E4] bg-white" />
        ))}
      </div>
    </div>
  );
}
