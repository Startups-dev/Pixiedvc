export default function OwnerNotificationsLoading() {
  return (
    <div className="space-y-8" aria-label="Loading notifications">
      <div className="space-y-3">
        <div className="h-3 w-40 rounded-full bg-[#ECECE8]" />
        <div className="h-10 w-56 rounded-full bg-[#ECECE8]" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-[#ECECE8]" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 rounded-[18px] border border-[#E7E7E4] bg-white" />
        ))}
      </div>
    </div>
  );
}
