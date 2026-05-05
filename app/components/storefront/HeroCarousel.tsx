"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { Banner } from "@/lib/data";

type Props = {
  banners: Banner[];
};

export default function HeroCarousel({ banners }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const t = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const goTo = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const banner = banners[index];

  return (
    <div className="mx-auto mt-4 w-full max-w-screen-md px-4">
      <div className="relative h-44 w-full overflow-hidden rounded-3xl shadow-card sm:h-56">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={banner.id}
            custom={direction}
            initial={{ opacity: 0, x: direction === 1 ? 80 : -80, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction === 1 ? -80 : 80, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className={`absolute inset-0 bg-gradient-to-br ${banner.gradient}`}
          >
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover opacity-60 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/20 to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white sm:p-7">
              <div className="max-w-[80%]">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur-md">
                  عرض حصري
                </span>
                <h2 className="mt-3 text-xl font-extrabold leading-tight drop-shadow-sm sm:text-2xl">
                  {banner.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-white/90 sm:text-[15px]">
                  {banner.subtitle}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-600 shadow-pop transition-transform hover:scale-[1.02] active:scale-95"
              >
                {banner.cta}
                <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {banners.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`الانتقال إلى العرض ${i + 1}`}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
          >
            <span
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-brand-500"
                  : "w-2 bg-neutral-400 hover:bg-neutral-500"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
