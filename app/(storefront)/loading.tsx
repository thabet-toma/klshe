export default function StorefrontLoading() {
  return (
    <div className="mx-auto w-full max-w-screen-md animate-pulse space-y-4 px-4 py-4">
      <div className="h-40 rounded-3xl bg-neutral-200" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-neutral-200" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
