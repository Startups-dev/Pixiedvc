export default function OwnerDashboardSkeleton() {
  return (
    <div className="space-y-8 px-6 py-10 lg:px-8">
      <div className="space-y-4">
        <div className="h-3 w-40 rounded-full bg-[#E7E7E4]" />
        <div className="h-10 w-64 rounded-full bg-[#E7E7E4]" />
        <div className="h-4 w-full max-w-md rounded-full bg-[#ECECE8]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-36 rounded-[18px] border border-[#E7E7E4] bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-[18px] border border-[#E7E7E4] bg-white" />
        <div className="h-80 rounded-[18px] border border-[#E7E7E4] bg-white" />
      </div>
    </div>
  );
}
