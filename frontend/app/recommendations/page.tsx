import JobCard from "@/components/JobCard";
import SourceBadge from "@/components/SourceBadge";
import { DISABILITY_FILTER, computeDisabilityMatchPercent } from "@/lib/disability-match";
import { getJobsWithMeta } from "@/lib/data";
import { KOREA_PROVINCE_KEYS, provinceLabel } from "@/lib/job-regions";
import { Job } from "@/types";

interface RecommendationsPageProps {
  searchParams: Promise<{
    region?: string;
    employmentType?: string;
    disabilityType?: string;
    keyword?: string;
  }>;
}

/** 필터 미선택 시 노출되는 안내 */
const FILTER_NEUTRAL_HINT =
  "장애 유형을 선택하면 한국장애인고용공단 구인 데이터의 근무환경(서기·시력·청력·중량물 등) 조건을 반영해 우선 확인할 만한 공고를 골라 봅니다.";

/** 장애 유형별 매칭 설명 (추천 배너) */
const DISABILITY_FILTER_COPY: Record<string, string> = {
  지체장애:
    "장시간 서기·무거운 물건을 많이 들어야 하는 환경을 피하고, 이동·기립 동선 부담이 상대적으로 낮은 공고를 우선 보여 줍니다.",
  시각장애:
    "아주 작은 글자 판독 부담이 낮은 직무, 시각에 덜 의존하는 환경을 우선 고려했습니다.",
  청각장애:
    "소음·듣고 말하기 부담이 상대적으로 낮은 업무환경 데이터를 우선 표시합니다.",
  발달장애:
    "복잡한 대인관계 스트레스가 낮은 역할·규칙적인 업무를 우선 고려합니다. 제공되는 근무환경 항목 범위 안에서는 중량물·장시간 기립 부담이 상대적으로 낮은 공고를 보여 줍니다.",
  기타: "환경 조건과 무관하게 전체 공고를 표시합니다.",
};

function matchesFilter(
  job: Job,
  region: string,
  employmentType: string,
  disabilityType: string,
  keyword: string,
): boolean {
  const regionOk = !region || job.location.includes(region);
  const typeOk = !employmentType || job.employmentType === employmentType;
  const disabilityOk =
    !disabilityType || !DISABILITY_FILTER[disabilityType] || DISABILITY_FILTER[disabilityType](job);
  const keywordOk =
    !keyword ||
    job.title.includes(keyword) ||
    job.companyName.includes(keyword) ||
    job.accessibilityTags.some((tag) => tag.includes(keyword));
  return regionOk && typeOk && disabilityOk && keywordOk;
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const params = await searchParams;
  const region = params.region?.trim() ?? "";
  const employmentType = params.employmentType?.trim() ?? "";
  const disabilityType = params.disabilityType?.trim() ?? "";
  const keyword = params.keyword?.trim() ?? "";

  const { jobs, source } = await getJobsWithMeta(60);
  const filteredJobs = jobs.filter((job) =>
    matchesFilter(job, region, employmentType, disabilityType, keyword)
  );

  const jobsForCards = filteredJobs.map((job) => ({
    ...job,
    matchPercent:
      computeDisabilityMatchPercent(job, disabilityType) ?? job.matchPercent,
  }));

  const hasFilter = !!(region || employmentType || disabilityType || keyword);

  return (
    <div className="min-h-screen bg-page">
      <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
            Job Search
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">장애 유형별 일자리 검색</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            장애 유형을 선택하면 근무환경 데이터(서기·시력·청력·중량물 등)를 기반으로
            접근 가능한 공고를 필터링합니다.
          </p>

          {!disabilityType ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              {FILTER_NEUTRAL_HINT}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-primary-200 bg-primary-50/70 px-4 py-3 text-sm text-primary-950 shadow-sm">
              <p className="font-semibold text-primary-900">
                현재 필터: {disabilityType === "기타" ? "기타" : disabilityType}
              </p>
              <p className="mt-1.5 leading-relaxed text-primary-900/95">
                {DISABILITY_FILTER_COPY[disabilityType] ?? FILTER_NEUTRAL_HINT}
              </p>
            </div>
          )}

          <form action="/recommendations" method="get" className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 장애 유형 — 핵심 필터 */}
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="font-medium">장애 유형</span>
              <select
                name="disabilityType"
                defaultValue={disabilityType}
                className="rounded-xl border border-primary-300 bg-primary-50/40 px-3 py-2 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">전체 (장애 유형 무관)</option>
                <option value="지체장애">지체장애 — 서기/걷기 부담 낮은 공고</option>
                <option value="시각장애">시각장애 — 시력 요구 낮은 공고</option>
                <option value="청각장애">청각장애 — 청력 요구 낮은 공고</option>
                <option value="발달장애">발달장애 — 중량 작업이 적은 공고</option>
                <option value="기타">기타 장애 — 환경 조건 무관 전체 공고</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>지역</span>
              <select
                name="region"
                defaultValue={region}
                className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">전체 지역</option>
                {KOREA_PROVINCE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {provinceLabel(key)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>고용형태</span>
              <select
                name="employmentType"
                defaultValue={employmentType}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">전체</option>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="일용직">일용직</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>키워드</span>
              <input
                name="keyword"
                defaultValue={keyword}
                placeholder="직무명 / 기업명"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-800"
              >
                검색
              </button>
              {hasFilter && (
                <a
                  href="/recommendations"
                  className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  초기화
                </a>
              )}
            </div>
          </form>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            아래 공고와{" "}
            <a
              href="/companies"
              className="font-semibold text-primary-800 underline-offset-4 hover:underline"
            >
              기업 친화도 정량 평가
            </a>
            는 같은 구인 데이터 풀에서 기업명을 가져옵니다. 기업명으로 검색하면 친화도 점수를 비교할 수
            있습니다.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
            <p className="text-sm text-slate-600">
              검색 결과{" "}
              <span className="font-semibold text-slate-900">{filteredJobs.length}</span>건
              {hasFilter && <span className="ml-1 text-slate-400">(전체 {jobs.length}건 중)</span>}
            </p>
            <SourceBadge
              source={source}
              liveLabel="실시간 공공데이터"
              staticLabel="추정 데이터 (공공 API 응답 지연/오류로 대체 표시 중)"
            />
          </div>

          {filteredJobs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {jobsForCards.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div
              role="status"
              className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"
            >
              <p className="font-medium text-slate-800">조건에 맞는 공고가 없습니다.</p>
              <p className="mt-1">장애 유형이나 지역 조건을 조정해 다시 검색해보세요.</p>
              <a href="/recommendations" className="mt-4 inline-block text-primary-700 underline">
                필터 초기화
              </a>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
