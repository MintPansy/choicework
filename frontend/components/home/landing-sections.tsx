import Link from "next/link";

import { JOB_DOMAINS } from "@/lib/job-domains";

type LandingHeroProps = {
  liveJobsTotal: number | null;
  source?: "live" | "static";
};

const HOME_CATEGORIES = [
  { icon: "🧭", label: "장애유형 맞춤추천", href: "/recommendations" },
  { icon: "🏢", label: "기업 친화도 비교", href: "/companies" },
  { icon: "🩺", label: "근무환경 조건 탐색", href: "/jobs/environment" },
  { icon: "💼", label: "정규직/계약직 찾기", href: "/jobs/employment-types" },
  { icon: "📍", label: "지역별 검색", href: "/jobs/regions" },
  { icon: "📊", label: "공고 데이터 요약", href: "/jobs/insights" },
  { icon: "💰", label: "지원금 계산기", href: "/support" },
  { icon: "☎️", label: "공단 상담/신청 연결", href: "/support/consulting" },
] as const;

export function LandingHero({ liveJobsTotal, source = "live" }: LandingHeroProps) {
  return (
    <section className="relative pb-14 pt-4 md:pb-16 md:pt-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mt-3 text-[1.55rem] font-bold leading-snug tracking-tight text-slate-900 md:text-[2rem]">
            내 조건에 맞는 공고를
            <br />
            홈에서 빠르게 탐색해보세요
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            통합 검색·취업 도메인으로 바로 시작하고, 지역별 검색에서는 시·도부터 단계적으로 고를 수
            있습니다. 추천 화면에서 장애 유형별 상세 조건까지 이어집니다.
          </p>
          {liveJobsTotal != null ? (
            <p
              className={`mt-3 text-sm font-medium tabular-nums ${
                source === "live" ? "text-primary-700" : "text-amber-700"
              }`}
            >
              {source === "live" ? "실시간 연동 공고" : "추정 공고 수(공공 API 응답 지연/오류)"}{" "}
              <span
                className={`font-bold ${source === "live" ? "text-primary-900" : "text-amber-900"}`}
              >
                {liveJobsTotal.toLocaleString()}건
              </span>
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <form action="/recommendations" method="get" className="rounded-2xl border border-slate-200 p-3">
            <label htmlFor="hero-search" className="sr-only">
              홈 검색
            </label>
            <div className="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-500 md:text-sm whitespace-nowrap shrink-0">통합검색</span>
              <input
                id="hero-search"
                name="keyword"
                placeholder="검색어를 입력해주세요"
                className="w-full border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none md:text-base"
              />
              <button
                type="submit"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                aria-label="검색"
              >
                →
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-slate-500 md:text-sm">
            <span className="font-semibold text-slate-600">취업 도메인</span>
            {JOB_DOMAINS.map((domain) => (
              <Link
                key={domain.slug}
                href={`/jobs/domain/${domain.slug}`}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {domain.label}
              </Link>
            ))}
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_CATEGORIES.map((category) => (
              <li key={category.label}>
                <Link
                  href={category.href}
                  className="flex min-h-[94px] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <span className="flex flex-col justify-between">
                    <span className="text-xl" aria-hidden>
                      {category.icon}
                    </span>
                    <span className="text-[15px] font-semibold text-slate-900">{category.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs text-slate-500">
            추천 페이지에서 장애 유형, 고용 형태, 근무환경 조건으로 더 세밀하게 필터링할 수 있습니다.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/recommendations"
            className="inline-flex items-center justify-center rounded-xl bg-primary-700 px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 md:text-base md:py-4 md:px-10"
          >
            장애 유형 선택하고 일자리 추천 받기
          </Link>
          <p className="mx-auto mt-4 max-w-lg text-xs text-slate-500">
            회원 가입 없이 탐색할 수 있습니다. 추천 결과에서 공고 상세, 기업 평가, 지원금 안내로
            자연스럽게 이동됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: "🧭",
    title: "장애 유형별 일자리 추천",
    description:
      "지체·시각·청각·발달·기타 필터와 지역·고용형태로 공고 후보를 좁혀, 내 조건과 맞춰 확인합니다.",
  },
  {
    icon: "📊",
    title: "근무환경 데이터 태그",
    description:
      "장시간 서기·양손 사용·청취/대화·중량물·시력 등 공공 원문 근무환경 항목을 카드 태그로 요약합니다.",
  },
  {
    icon: "🏢",
    title: "기업 장애 친화도 점수·차트",
    description:
      "고용률·접근성·복지 등 지표와 표준사업장 정보를 카드와 상세 페이지에서 숫자·차트로 비교합니다.",
  },
  {
    icon: "💰",
    title: "지원금 참고 계산과 공단 안내 링크",
    description:
      "간이 계산 결과를 참고한 뒤, 한국장애인고용공단 상담·신청 페이지로 자연스럽게 넘어갈 수 있습니다.",
  },
  {
    icon: "🗂️",
    title: "경기도 중심 공공데이터 정규화",
    description:
      "1차 MVP는 경기도 시나리오에 맞춰 데이터를 매핑했고, 구조는 전국 확장에 맞춰 두었습니다.",
  },
] as const;

export function LandingFeatures() {
  return (
    <section className="border-t border-slate-200/80 py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-0">
        <h2 className="text-center text-xl font-bold text-slate-900 md:text-2xl">
          장애인 취업 의사결정을 돕는 ChoiceWork 기능
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 md:text-base">
          공모전·실제 연동 검증용으로 핵심 기능만 골라 명확히 보여 줍니다.
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <li
              key={item.title}
              className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingWhy() {
  return (
    <section className="border-t border-slate-200/80 bg-slate-50/60 py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-0">
        <h2 className="text-center text-xl font-bold text-slate-900 md:text-2xl">
          왜 이런 서비스가 필요할까요?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
          채용 공고 자체는 많지만, &apos;일하기 좋은지&apos;를 판단하려면 다른 정보가 필요합니다.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              문제
            </h3>
            <p className="mt-2 text-lg font-semibold text-slate-900">기존 장애인 취업 정보 UX</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li className="flex gap-2">
                <span className="font-bold text-red-700">·</span>
                채용만 보여 주고 실제 업무 현장 환경(서기·소음 등) 근거는 찾기 어렵습니다.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-red-700">·</span>
                장애 유형별로 &apos;이 공고가 맞나&apos;를 빠르게 걸러 볼 방법이 부족합니다.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-red-700">·</span>
                채용을 고려하는 기업도 활용 가능한 장려금과 절차를 한 화면에서 이어 보기 어렵습니다.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-red-700">·</span>
                공고 위주 검색이라 &apos;의사결정 → 행동&apos;까지 흐름이 끊기기 쉽습니다.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-primary-100 bg-white p-6 md:p-8 md:shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary-700">
              해결
            </h3>
            <p className="mt-2 text-lg font-semibold text-slate-900">ChoiceWork의 접근</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li className="flex gap-2">
                <span className="font-bold text-primary-700">·</span>
                경기도 중심으로 공공 원천 필드를 우선 정규화해 신뢰 가능한 카드 형태로 모았습니다.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary-700">·</span>
                근무환경 항목·태그와 장애 유형 선택을 같은 화면 흐름에 묶었습니다.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary-700">·</span>
                기업별 장애 친화도 지표를 숫자로 비교해 &apos;왜 이 기업인가&apos;를 설명합니다.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary-700">·</span>
                간이 지원금 계산과 한국장애인고용공단 신청·상담 연결까지 한 서비스 스토리로 잇습니다.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingDemoScenario() {
  return (
    <section className="border-t border-slate-200/80 py-14 md:py-20">
      <div className="mx-auto max-w-3xl text-center px-4 sm:px-0">
        <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
          실제 사용 흐름을 한 번에 보여드립니다
        </h2>
        <p className="mt-4 text-left text-sm leading-relaxed text-slate-600 md:text-base md:text-center">
          예를 들어&nbsp;
          <span className="font-semibold text-slate-900">경기도에 거주하는 시각장애 구직자</span>
          라면 다음과 같은 시나리오를 상상할 수 있습니다.
        </p>
        <ol className="mx-auto mt-8 max-w-2xl space-y-4 text-left text-sm leading-relaxed text-slate-700 md:text-base">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-900">
              1
            </span>
            <span>
              홈에서 추천으로 이동해 <strong className="text-slate-900">시각장애 필터와 지역</strong>
              등을 선택해 공고 후보를 모읍니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-900">
              2
            </span>
            <span>
              추천된 공고 카드와 상세 페이지에서 근무환경 조건과&nbsp;
              <strong className="text-slate-900">연관된 기업 친화도</strong>
              정보를 함께 확인합니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-900">
              3
            </span>
            <span>
              홈 또는 상세 안내에서 <strong className="text-slate-900">지원금 간이 계산기</strong>와
              <strong className="text-slate-900"> 한국장애인고용공단 상담·신청</strong>
              페이지로 마음을 바로 옮길 수 있습니다.
            </span>
          </li>
        </ol>

        <div className="mt-12">
          <Link
            href="/recommendations"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 md:text-base md:py-3.5"
          >
            지금 경기도 일자리 추천 받아보기
          </Link>
        </div>
      </div>
    </section>
  );
}
