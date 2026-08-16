"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DEMO_USER } from "@/lib/demo-auth";

const MARKETING_ROUTES = new Set(["/about", "/features", "/guide"]);

interface SiteHeaderClientProps {
  isLoggedIn: boolean;
}

export default function SiteHeaderClient({ isLoggedIn }: SiteHeaderClientProps) {
  const pathname = usePathname();
  const compactHeader = pathname ? MARKETING_ROUTES.has(pathname) : false;

  return (
    <header
      className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md ${
        compactHeader ? "" : "border-b border-slate-200/80"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-end gap-2.5"
            aria-label="Choicework 홈으로"
          >
            <Image
              src="/choicework.png"
              alt=""
              width={256}
              height={256}
              className="h-12 w-auto shrink-0 object-contain"
              priority
            />
            <Image
              src="/choicework_text.png"
              alt=""
              width={520}
              height={120}
              className="h-8 w-auto max-h-10 shrink-0 object-contain object-bottom md:h-9"
              priority
            />
          </Link>
          <Link
            href="/recommendations"
            className="shrink-0 text-sm font-semibold text-primary-700 transition hover:text-primary-900 md:hidden"
          >
            일자리
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              서비스 소개
            </Link>
            <Link href="/features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              핵심 기능
            </Link>
            <Link href="/guide" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              이용 가이드
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/saved-jobs"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="관심 공고"
          >
            ♥
          </Link>
          <Link
            href="/recommendations"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="검색 페이지로 이동"
          >
            🔍
          </Link>
          {isLoggedIn ? (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
              <Image
                src={DEMO_USER.profileImage}
                alt={`${DEMO_USER.name} 프로필`}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="text-xs font-semibold text-slate-700 md:text-sm">{DEMO_USER.name}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:text-xs"
                >
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 md:text-sm"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
