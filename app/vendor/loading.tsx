export default function VendorLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-40 rounded-xl bg-neutral-200" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-200" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-neutral-200" />
    </div>
  );
}
