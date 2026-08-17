"use client";

import { useEffect, useState } from "react";

interface BookmarkButtonProps {
  storageKey: string;
  label?: string;
}

export default function BookmarkButton({ storageKey, label = "찜" }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bookmarks");
      const bookmarks: string[] = stored ? JSON.parse(stored) : [];
      setSaved(bookmarks.includes(storageKey));
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  function toggle() {
    try {
      const stored = localStorage.getItem("bookmarks");
      const bookmarks: string[] = stored ? JSON.parse(stored) : [];
      const next = saved
        ? bookmarks.filter((k) => k !== storageKey)
        : [...bookmarks, storageKey];
      localStorage.setItem("bookmarks", JSON.stringify(next));
      setSaved(!saved);
    } catch {
      // localStorage unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? `${label} 해제` : `${label} 저장`}
      aria-pressed={saved}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
        saved
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span aria-hidden>{saved ? "♥" : "♡"}</span>
      {saved ? "찜 완료" : label}
    </button>
  );
}
