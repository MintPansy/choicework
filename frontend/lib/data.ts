import {
  AccessibilitySummary,
  ActivitySupportInstitution,
  Company,
  CompanyRatingMethodology,
  Job,
} from "@/types";
import { api, type LiveJobsMergedMeta } from "./api";
import { companies as mockCompanies, jobs as mockJobs } from "./mockData";
import { DEMO_RATING_METHODOLOGY } from "./methodologyDemo";
import { normalizeCompanyNameKey } from "./company-name-normalize";
import {
  companyNameFromJobPoolId,
  synthesizeCompanyFromJobPool,
} from "./companies-job-pool";
import { getKeadJobComparison, getMergedKeadJobs } from "./kead-jobs";

const USE_MOCK = !(process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL);

/** 로컬 `npm run dev`에서 기업 친화도 UI는 더미로 고정(채용 공고 등 다른 API는 그대로). 실제 백엔드 연동 테스트 시 `.env`에 `NEXT_PUBLIC_USE_LIVE_COMPANY_API=true` */
export function isDevCompanyDemoMode(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_LIVE_COMPANY_API !== "true"
  );
}
const ALLOW_MOCK_FALLBACK =
  process.env.NEXT_PUBLIC_ALLOW_MOCK_FALLBACK === "true" || process.env.NODE_ENV !== "production";
const API_RETRY_COOLDOWN_MS = 30_000;
let apiDisabledUntil = 0;

function shouldUseApi(): boolean {
  if (USE_MOCK) return false;
  return Date.now() >= apiDisabledUntil;
}

function apiErrorSummary(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof Error && "code" in cause) {
    const code = (cause as NodeJS.ErrnoException).code;
    if (code === "ECONNREFUSED") {
      return "ECONNREFUSED — 백엔드(예: 127.0.0.1:8000)가 꺼져 있거나 주소가 다릅니다.";
    }
  }
  return error.message;
}

function disableApiTemporarily(reason: unknown): void {
  apiDisabledUntil = Date.now() + API_RETRY_COOLDOWN_MS;
  console.warn(
    `API unavailable for ${API_RETRY_COOLDOWN_MS / 1000}s: ${apiErrorSummary(reason)}`
  );
}

/**
 * 폴백 캐스케이드의 "한 단계"를 표준화하는 헬퍼.
 * guard가 false면 아예 호출하지 않고(백엔드를 안 쓰기로 한 상태 등), 호출이 실패하면
 * 쿨다운을 걸고 조용히 undefined를 반환한다 — 호출부는 다음 소스로 넘어가면 된다.
 */
async function attempt<T>(guard: boolean, source: () => Promise<T>): Promise<T | undefined> {
  if (!guard) return undefined;
  try {
    return await source();
  } catch (error) {
    disableApiTemporarily(error);
    return undefined;
  }
}

function findById<T extends { id: string }>(items: T[] | undefined, id: string): T | undefined {
  return items?.find((item) => item.id === id);
}

const emptyAccessibilitySummary: AccessibilitySummary = {
  regions: [],
  maxCount: 0,
  totalInstitutions: 0,
};

export async function getRatingMethodology(): Promise<CompanyRatingMethodology | null> {
  if (isDevCompanyDemoMode()) {
    return DEMO_RATING_METHODOLOGY;
  }
  const result = await attempt(shouldUseApi(), () => api.ratingMethodology());
  return result ?? null;
}

export async function getAccessibilitySummary(): Promise<AccessibilitySummary> {
  const result = await attempt(shouldUseApi(), () => api.accessibilitySummary());
  return result ?? emptyAccessibilitySummary;
}

export async function getAccessibilityInstitutions(
  sigunNm?: string
): Promise<ActivitySupportInstitution[]> {
  const result = await attempt(shouldUseApi(), () => api.accessibilityInstitutions(sigunNm));
  return result ?? [];
}

export async function getCompanies(): Promise<Company[]> {
  const result = await getCompaniesWithMeta();
  return result.companies;
}

export async function getCompaniesWithMeta(): Promise<{
  source: "live" | "static";
  syncedAt: string | null;
  companies: Company[];
}> {
  if (isDevCompanyDemoMode()) {
    return { source: "static", syncedAt: null, companies: mockCompanies };
  }
  if (!shouldUseApi()) {
    return {
      source: "static",
      syncedAt: null,
      companies: ALLOW_MOCK_FALLBACK ? mockCompanies : [],
    };
  }

  const raw = await attempt(true, () => api.companies());
  if (raw === undefined) {
    return {
      source: "static",
      syncedAt: null,
      companies: ALLOW_MOCK_FALLBACK ? mockCompanies : [],
    };
  }
  if (Array.isArray(raw)) {
    return {
      source: "static",
      syncedAt: null,
      companies: raw.map((c, i) => ({ ...c, id: String(i) })),
    };
  }
  return {
    source: raw.source ?? "static",
    syncedAt: raw.syncedAt ?? null,
    companies: raw.data.map((c, i) => ({ ...c, id: String(i) })),
  };
}

/** 실데이터 소스 우선순위: 백엔드 live-merged → KEAD 직접 병합 → 백엔드 live-with-env → 백엔드 mock(/jobs) → 로컬 mock */
export async function getJobs(numOfRows = 20): Promise<Job[]> {
  const result = await getJobsWithMeta(numOfRows);
  return result.jobs;
}

/** getJobs와 동일한 폴백 순서를 따르되, 어느 단계에서 데이터를 받았는지(source)를 함께 반환한다.
 *  UI는 이 source로 "실시간" vs "추정" 배지를 노출한다. */
export async function getJobsWithMeta(numOfRows = 20): Promise<{
  source: "live" | "static";
  jobs: Job[];
}> {
  const merged = await attempt(shouldUseApi(), () => api.liveJobsMerged(1, numOfRows));
  if (merged && merged.jobs.length > 0) return merged;

  const keadJobs = await getMergedKeadJobs(1, numOfRows);
  if (keadJobs.length > 0) return { source: "live", jobs: keadJobs };

  if (!shouldUseApi()) {
    return { source: "static", jobs: ALLOW_MOCK_FALLBACK ? mockJobs : [] };
  }

  const withEnv = await attempt(true, () => api.liveJobsWithEnv(1, numOfRows));
  if (withEnv) return withEnv;

  const legacy = await attempt(true, () => api.jobs());
  if (legacy) return { source: legacy.source, jobs: legacy.jobs.slice(0, numOfRows) };

  return { source: "static", jobs: ALLOW_MOCK_FALLBACK ? mockJobs : [] };
}

/**
 * 상세 조회용 후보군 크기. job.id는 더 이상 배열 인덱스가 아니라 공고 내용 기반 안정 식별자이므로,
 * "몇 번째까지 가져와야 하는지"를 알 수 없다 — 목록과 동일한 소스에서 충분히 큰 배치를 받아 id로 찾는다.
 * (companies 쪽 job pool 매칭에서 이미 쓰는 규모(400~500)와 동일한 선상)
 */
const DETAIL_LOOKUP_COUNT = 500;

export async function getJobById(id: string): Promise<Job | null> {
  const result = await getJobByIdWithMeta(id);
  return result.job;
}

/** getJobById와 동일한 폴백 순서를 따르되, 조회에 성공한 소스(source)를 함께 반환한다. */
export async function getJobByIdWithMeta(id: string): Promise<{
  job: Job | null;
  source: "live" | "static";
}> {
  if (!id) return { job: null, source: "static" };

  const merged = await attempt(shouldUseApi(), () => api.liveJobsMerged(1, DETAIL_LOOKUP_COUNT));
  const mergedHit = findById(merged?.jobs, id);
  if (mergedHit) return { job: mergedHit, source: merged!.source };

  const keadJobs = await getMergedKeadJobs(1, DETAIL_LOOKUP_COUNT);
  const keadHit = findById(keadJobs, id);
  if (keadHit) return { job: keadHit, source: "live" };

  if (!shouldUseApi()) {
    return { job: ALLOW_MOCK_FALLBACK ? (findById(mockJobs, id) ?? null) : null, source: "static" };
  }

  const withEnv = await attempt(true, () => api.liveJobsWithEnv(1, DETAIL_LOOKUP_COUNT));
  const envHit = findById(withEnv?.jobs, id);
  if (envHit) return { job: envHit, source: withEnv!.source };

  return { job: ALLOW_MOCK_FALLBACK ? (findById(mockJobs, id) ?? null) : null, source: "static" };
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const companies = await getCompanies();
  const fromList = companies.find((c) => c.id === id);
  if (fromList) return fromList;

  const poolName = companyNameFromJobPoolId(id);
  if (!poolName) return null;

  const jobs = await getJobs(500);
  const targetKey = normalizeCompanyNameKey(poolName);
  const rows = jobs.filter((j) => normalizeCompanyNameKey(j.companyName) === targetKey);
  if (rows.length === 0) return null;

  const apiCompanies = await getCompanies();
  const apiHit = apiCompanies.find((c) => normalizeCompanyNameKey(c.companyName) === targetKey);
  if (apiHit) return apiHit;

  return synthesizeCompanyFromJobPool(poolName, rows);
}

export async function getLiveJobsTotal(): Promise<number> {
  const result = await getLiveJobsTotalWithMeta();
  return result.total;
}

/** getLiveJobsTotal과 동일한 폴백 순서를 따르되, 집계에 사용한 소스(source)를 함께 반환한다.
 *  홈 화면의 "실시간 연동 공고 N건" 문구가 실제로 실시간인지, 추정치인지를 이 값으로 구분한다. */
export async function getLiveJobsTotalWithMeta(): Promise<{
  total: number;
  source: "live" | "static";
}> {
  const comparison = await attempt(shouldUseApi(), () => api.liveJobsComparison());
  if (comparison && (comparison.jobListEnvTotal > 0 || comparison.jobListTotal > 0)) {
    return { total: comparison.jobListEnvTotal || comparison.jobListTotal, source: "live" };
  }

  const keadJobs = await getMergedKeadJobs(1, 1);
  if (keadJobs.length > 0) {
    const keadComparison = await getKeadJobComparison(1, 1);
    return {
      total: keadComparison.jobListEnvTotal || keadComparison.jobListTotal || keadJobs.length,
      source: "live",
    };
  }

  if (!shouldUseApi()) {
    return { total: ALLOW_MOCK_FALLBACK ? mockJobs.length : 0, source: "static" };
  }

  const total = await attempt(true, () => api.liveJobsTotal());
  if (total !== undefined) return { total: total.total, source: total.source };

  const legacy = await attempt(true, () => api.jobs());
  if (legacy) return { total: legacy.jobs.length, source: legacy.source };

  return { total: ALLOW_MOCK_FALLBACK ? mockJobs.length : 0, source: "static" };
}

export async function getLiveJobsComparison() {
  const comparison = await attempt(shouldUseApi(), () => api.liveJobsComparison());
  if (comparison) {
    return {
      jobListTotal: comparison.jobListTotal,
      jobListEnvTotal: comparison.jobListEnvTotal,
      jobListResultCode: "0000",
      jobListEnvResultCode: "0000",
    };
  }
  return getKeadJobComparison(1, 1);
}

function estimateMergedMetaFromComparison(comparison: {
  jobListTotal: number;
  jobListEnvTotal: number;
}): LiveJobsMergedMeta {
  const rawTotal = Math.max(0, comparison.jobListTotal);
  const envTotal = Math.max(0, comparison.jobListEnvTotal);
  const envCapped = rawTotal > 0 ? Math.min(envTotal, rawTotal) : envTotal;
  const coverageRate = rawTotal > 0 ? Math.min(100, Math.round((envCapped / rawTotal) * 1000) / 10) : 0;

  return {
    requestedCount: 200,
    collectedPages: 0,
    rawCollectedCount: rawTotal,
    envCollectedCount: envCapped,
    mergedCount: Math.min(envCapped, 200),
    mergeMatchRate: coverageRate,
    rawTotalCount: rawTotal,
    envTotalCount: envTotal,
  };
}

export async function getLiveJobsMergedMeta(): Promise<{
  meta: LiveJobsMergedMeta;
  isEstimated: boolean;
}> {
  const meta = await attempt(shouldUseApi(), () => api.liveJobsMergedMeta(1, 200));
  if (meta) return { meta, isEstimated: false };

  const comparison = await getLiveJobsComparison();
  return {
    meta: estimateMergedMetaFromComparison(comparison),
    isEstimated: true,
  };
}
