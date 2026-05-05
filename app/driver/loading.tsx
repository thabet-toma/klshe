export default function DriverLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-32 rounded-xl bg-neutral-200" />
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
