"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Package, Search, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/app/components/i18n/I18nProvider";
import type {
  SearchSuggestProduct,
  SearchSuggestVendor,
} from "@/lib/supabase/storefront";

const DEBOUNCE_MS = 300;

export default function SearchBar() {
  const { messages } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<SearchSuggestVendor[]>([]);
  const [products, setProducts] = useState<SearchSuggestProduct[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef("");

  const runFetch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setVendors([]);
      setProducts([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const expected = q;
      latestRef.current = expected;
      try {
        const res = await fetch(
          `/api/storefront/search-suggest?q=${encodeURIComponent(expected)}`,
        );
        if (!res.ok) throw new Error("suggest failed");
        const data = (await res.json()) as {
          vendors?: SearchSuggestVendor[];
          products?: SearchSuggestProduct[];
        };
        if (latestRef.current !== expected) return;
        const v = data.vendors ?? [];
        const p = data.products ?? [];
        setVendors(v);
        setProducts(p);
        setOpen(v.length + p.length > 0);
      } catch {
        if (latestRef.current === expected) {
          setVendors([]);
          setProducts([]);
          setOpen(false);
        }
      } finally {
        if (latestRef.current === expected) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const hasSuggestions = vendors.length > 0 || products.length > 0;
  const showPanel =
    value.trim().length >= 2 && (loading || open) && (loading || hasSuggestions);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto -mt-5 w-full max-w-screen-md px-4"
    >
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-card ring-1 ring-black/5"
      >
        <label className="flex flex-1 items-center gap-2 px-2">
          <Search
            className="h-5 w-5 shrink-0 text-neutral-400"
            strokeWidth={2.2}
          />
          <input
            type="search"
            name="q"
            value={value}
            onChange={(e) => {
              const nextValue = e.target.value;
              setValue(nextValue);
              runFetch(nextValue.trim());
            }}
            onFocus={() => {
              if (value.trim().length >= 2 && hasSuggestions) setOpen(true);
            }}
            placeholder={messages.search.placeholder}
            autoComplete="off"
            className="w-full bg-transparent py-2 text-sm font-medium outline-none placeholder:text-neutral-400"
            aria-autocomplete="list"
          />
        </label>
        <button
          type="button"
          aria-label={messages.search.filterSoon}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 active:bg-brand-200"
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </form>

      {showPanel ? (
        <div
          id="search-suggest-listbox"
          role="listbox"
          aria-label={messages.search.suggestions}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-2xl border border-neutral-200 bg-white py-2 shadow-xl ring-1 ring-black/5"
        >
          {loading && !hasSuggestions ? (
            <p className="px-4 py-3 text-sm text-neutral-500">{messages.search.loading}</p>
          ) : (
            <>
              {vendors.length > 0 && (
                <div className="px-2 pb-1">
                  <p className="px-2 py-1 text-xs font-bold text-neutral-400">
                    {messages.search.stores}
                  </p>
                  {vendors.map((v) => (
                    <Link
                      key={`suggest-v-${v.id}`}
                      href={`/store/${encodeURIComponent(v.slug)}`}
                      role="option"
                      className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-neutral-900 hover:bg-neutral-50"
                      onClick={() => setOpen(false)}
                    >
                      <Building2
                        className="h-4 w-4 shrink-0 text-brand-500"
                        aria-hidden
                      />
                      <span className="font-medium">{v.name}</span>
                    </Link>
                  ))}
                </div>
              )}
              {products.length > 0 && (
                <div className="px-2 pt-1">
                  <p className="px-2 py-1 text-xs font-bold text-neutral-400">
                    {messages.search.products}
                  </p>
                  {products.map((p) => (
                    <Link
                      key={`suggest-p-${p.id}`}
                      href={`/product/${encodeURIComponent(p.id)}`}
                      role="option"
                      className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-neutral-900 hover:bg-neutral-50"
                      onClick={() => setOpen(false)}
                    >
                      <Package
                        className="h-4 w-4 shrink-0 text-amber-600"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 font-medium">
                        {p.name}
                      </span>
                      {p.vendor_slug ? (
                        <span className="truncate text-xs text-neutral-500">
                          {p.vendor_slug}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
