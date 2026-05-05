export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-48 rounded-xl bg-neutral-200" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-neutral-200" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-neutral-200" />
    </div>
  );
}
