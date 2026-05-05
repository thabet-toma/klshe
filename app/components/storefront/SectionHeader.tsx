import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  cta?: string;
};

export default function SectionHeader({ title, subtitle, cta = "عرض الكل" }: Props) {
  return (
    <div className="mx-auto mb-3 flex w-full max-w-screen-md items-end justify-between gap-3 px-4">
      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-neutral-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[12px] font-medium text-neutral-500">
            {subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-bold text-brand-700 transition-colors hover:text-brand-800"
      >
        {cta}
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}
