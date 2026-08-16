import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Company, Job } from "@/types";
import { companies as mockCompanies } from "../mockData";
import { DEMO_RATING_METHODOLOGY } from "../methodologyDemo";

const mockApi = {
  liveJobsMerged: vi.fn(),
  liveJobsWithEnv: vi.fn(),
  jobs: vi.fn(),
  companies: vi.fn(),
  ratingMethodology: vi.fn(),
  accessibilitySummary: vi.fn(),
  accessibilityInstitutions: vi.fn(),
  liveJobsTotal: vi.fn(),
  liveJobsComparison: vi.fn(),
  liveJobsMergedMeta: vi.fn(),
};

const mockGetMergedKeadJobs = vi.fn();
const mockGetKeadJobComparison = vi.fn();

vi.mock("../api", () => ({ api: mockApi }));
vi.mock("../kead-jobs", () => ({
  getMergedKeadJobs: mockGetMergedKeadJobs,
  getKeadJobComparison: mockGetKeadJobComparison,
}));

function makeJob(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    title: `직무-${id}`,
    companyName: `기업-${id}`,
    location: "서울",
    employmentType: "정규직",
    accessibilityTags: [],
    ...overrides,
  };
}

/** 모듈 상단의 USE_MOCK/ALLOW_MOCK_FALLBACK은 import 시점 env로 고정되므로,
 *  시나리오별로 모듈을 새로 로드해 원하는 env 조합을 적용한다. */
async function loadData(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
  return import("../data");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMergedKeadJobs.mockResolvedValue([]);
  mockGetKeadJobComparison.mockResolvedValue({
    jobListTotal: 0,
    jobListEnvTotal: 0,
    jobListResultCode: "0000",
    jobListEnvResultCode: "0000",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getJobs 폴백 순서 (live-merged → KEAD 직접 병합 → live-with-env → /jobs → mock)", () => {
  it("백엔드 live-merged가 성공하면 그 결과를 그대로 쓰고 다른 소스는 호출하지 않는다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({
      jobs: [makeJob("a"), makeJob("b")],
      source: "live",
    });
    const { getJobs } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobs(20);

    expect(result.map((j) => j.id)).toEqual(["a", "b"]);
    expect(mockGetMergedKeadJobs).not.toHaveBeenCalled();
    expect(mockApi.liveJobsWithEnv).not.toHaveBeenCalled();
  });

  it("live-merged가 실패해도 KEAD 직접 병합에서 데이터를 받으면 그것을 쓴다", async () => {
    mockApi.liveJobsMerged.mockRejectedValue(new Error("network down"));
    mockGetMergedKeadJobs.mockResolvedValue([makeJob("kead-1")]);
    const { getJobs } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobs(20);

    expect(result.map((j) => j.id)).toEqual(["kead-1"]);
    expect(mockApi.liveJobsWithEnv).not.toHaveBeenCalled();
  });

  it("live-merged/KEAD 모두 비어 있으면 live-with-env로 넘어간다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [], source: "live" });
    mockApi.liveJobsWithEnv.mockResolvedValue({ jobs: [makeJob("env-1")], source: "live" });
    const { getJobs } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobs(20);

    expect(result.map((j) => j.id)).toEqual(["env-1"]);
  });

  it("모든 실데이터 소스가 실패하고 mock 폴백이 허용되면 mock 데이터를 반환한다", async () => {
    mockApi.liveJobsMerged.mockRejectedValue(new Error("down"));
    mockApi.liveJobsWithEnv.mockRejectedValue(new Error("down"));
    mockApi.jobs.mockRejectedValue(new Error("down"));
    const { getJobs } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "development",
    });

    const result = await getJobs(20);

    expect(result.length).toBeGreaterThan(0);
  });

  it("모든 실데이터 소스가 실패하고 mock 폴백이 금지되면 빈 배열을 반환한다", async () => {
    mockApi.liveJobsMerged.mockRejectedValue(new Error("down"));
    mockApi.liveJobsWithEnv.mockRejectedValue(new Error("down"));
    mockApi.jobs.mockRejectedValue(new Error("down"));
    const { getJobs } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
      NEXT_PUBLIC_ALLOW_MOCK_FALLBACK: "false",
    });

    const result = await getJobs(20);

    expect(result).toEqual([]);
  });

  it("NEXT_PUBLIC_API_URL이 없으면 백엔드를 아예 호출하지 않고 KEAD부터 시도한다", async () => {
    mockGetMergedKeadJobs.mockResolvedValue([makeJob("kead-only")]);
    const { getJobs } = await loadData({});

    const result = await getJobs(20);

    expect(mockApi.liveJobsMerged).not.toHaveBeenCalled();
    expect(result.map((j) => j.id)).toEqual(["kead-only"]);
  });
});

describe("getJobsWithMeta — 실시간/추정 source 태깅", () => {
  it("백엔드 live-merged 성공 시 source는 백엔드가 내려준 값을 그대로 쓴다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [makeJob("a")], source: "live" });
    const { getJobsWithMeta } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobsWithMeta(20);

    expect(result.source).toBe("live");
  });

  it("KEAD 직접 병합으로 폴백하면 source는 live로 태깅한다 (실시간 공공데이터이므로)", async () => {
    mockApi.liveJobsMerged.mockRejectedValue(new Error("down"));
    mockGetMergedKeadJobs.mockResolvedValue([makeJob("kead-1")]);
    const { getJobsWithMeta } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobsWithMeta(20);

    expect(result.source).toBe("live");
  });

  it("모든 실데이터 소스가 실패해 mock으로 폴백하면 source는 static이다", async () => {
    mockApi.liveJobsMerged.mockRejectedValue(new Error("down"));
    mockApi.liveJobsWithEnv.mockRejectedValue(new Error("down"));
    mockApi.jobs.mockRejectedValue(new Error("down"));
    const { getJobsWithMeta } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "development",
    });

    const result = await getJobsWithMeta(20);

    expect(result.source).toBe("static");
  });

  it("백엔드 legacy(/jobs) 정적 목록까지 내려가면 백엔드가 내려준 source(static)를 쓴다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [], source: "live" });
    mockApi.liveJobsWithEnv.mockRejectedValue(new Error("down"));
    mockApi.jobs.mockResolvedValue({ jobs: [makeJob("legacy-1")], source: "static" });
    const { getJobsWithMeta } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobsWithMeta(20);

    expect(result.source).toBe("static");
    expect(result.jobs.map((j) => j.id)).toEqual(["legacy-1"]);
  });
});

describe("getJobById (id는 배열 인덱스가 아니라 안정 식별자 기준으로 조회)", () => {
  it("live-merged 배치에서 id가 일치하는 공고를 찾아 반환한다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({
      jobs: [makeJob("x1"), makeJob("target"), makeJob("x3")],
      source: "live",
    });
    const { getJobById } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobById("target");

    expect(result?.id).toBe("target");
  });

  it("live-merged에 없으면 KEAD 배치에서 찾는다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [makeJob("other")], source: "live" });
    mockGetMergedKeadJobs.mockResolvedValue([makeJob("kead-target")]);
    const { getJobById } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobById("kead-target");

    expect(result?.id).toBe("kead-target");
  });

  it("어디에서도 못 찾으면 null을 반환한다(존재하지 않는 id로 엉뚱한 공고를 반환하지 않는다)", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [makeJob("a")], source: "live" });
    mockApi.liveJobsWithEnv.mockResolvedValue({ jobs: [makeJob("b")], source: "live" });
    const { getJobById } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
      NEXT_PUBLIC_ALLOW_MOCK_FALLBACK: "false",
    });

    const result = await getJobById("no-such-id");

    expect(result).toBeNull();
  });

  it("빈 id는 조회 자체를 시도하지 않고 null을 반환한다", async () => {
    const { getJobById } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobById("");

    expect(result).toBeNull();
    expect(mockApi.liveJobsMerged).not.toHaveBeenCalled();
  });
});

describe("getJobByIdWithMeta — 실시간/추정 source 태깅", () => {
  it("live-merged 배치에서 찾으면 백엔드가 내려준 source를 그대로 쓴다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [makeJob("target")], source: "live" });
    const { getJobByIdWithMeta } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobByIdWithMeta("target");

    expect(result.job?.id).toBe("target");
    expect(result.source).toBe("live");
  });

  it("KEAD 직접 조회로 찾으면 source는 live다", async () => {
    mockApi.liveJobsMerged.mockResolvedValue({ jobs: [], source: "live" });
    mockGetMergedKeadJobs.mockResolvedValue([makeJob("kead-target")]);
    const { getJobByIdWithMeta } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getJobByIdWithMeta("kead-target");

    expect(result.source).toBe("live");
  });

  it("mock 폴백까지 내려가면 source는 static이다", async () => {
    mockApi.liveJobsMerged.mockRejectedValue(new Error("down"));
    mockApi.liveJobsWithEnv.mockRejectedValue(new Error("down"));
    const { getJobByIdWithMeta } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "development",
    });

    const result = await getJobByIdWithMeta("job-1");

    expect(result.source).toBe("static");
  });
});

describe("getRatingMethodology", () => {
  it("개발 데모 모드에서는 API를 부르지 않고 데모 방법론을 반환한다", async () => {
    const { getRatingMethodology } = await loadData({ NODE_ENV: "development" });

    const result = await getRatingMethodology();

    expect(result).toEqual(DEMO_RATING_METHODOLOGY);
    expect(mockApi.ratingMethodology).not.toHaveBeenCalled();
  });

  it("API 사용 불가 상태(URL 없음)면 null을 반환한다", async () => {
    const { getRatingMethodology } = await loadData({ NODE_ENV: "production" });

    const result = await getRatingMethodology();

    expect(result).toBeNull();
  });

  it("API가 실패하면 null을 반환한다", async () => {
    mockApi.ratingMethodology.mockRejectedValue(new Error("down"));
    const { getRatingMethodology } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
    });

    const result = await getRatingMethodology();

    expect(result).toBeNull();
  });
});

describe("getCompaniesWithMeta", () => {
  function makeCompany(id: string): Company {
    return {
      id,
      companyName: `기업-${id}`,
      location: "서울",
      disabledEmploymentRate: 3,
      retentionRate: 80,
      jobDiversity: 70,
      friendlinessScore: 75,
    };
  }

  it("개발 데모 모드에서는 mock 기업 목록을 반환한다", async () => {
    const { getCompaniesWithMeta } = await loadData({ NODE_ENV: "development" });

    const result = await getCompaniesWithMeta();

    expect(result.source).toBe("static");
    expect(result.companies).toEqual(mockCompanies);
  });

  it("API가 배열을 반환하면 인덱스 기반 id를 붙여 static 소스로 감싼다", async () => {
    mockApi.companies.mockResolvedValue([makeCompany("ignored"), makeCompany("ignored2")]);
    const { getCompaniesWithMeta } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
    });

    const result = await getCompaniesWithMeta();

    expect(result.source).toBe("static");
    expect(result.companies.map((c) => c.id)).toEqual(["0", "1"]);
  });

  it("API가 {source, syncedAt, data} 형태를 반환하면 그대로 전달한다", async () => {
    mockApi.companies.mockResolvedValue({
      source: "live",
      syncedAt: "2026-08-15T00:00:00Z",
      data: [makeCompany("x")],
    });
    const { getCompaniesWithMeta } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
    });

    const result = await getCompaniesWithMeta();

    expect(result.source).toBe("live");
    expect(result.syncedAt).toBe("2026-08-15T00:00:00Z");
    expect(result.companies[0]?.id).toBe("0");
  });

  it("API 실패 + mock 폴백 금지면 빈 목록을 반환한다", async () => {
    mockApi.companies.mockRejectedValue(new Error("down"));
    const { getCompaniesWithMeta } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
      NEXT_PUBLIC_ALLOW_MOCK_FALLBACK: "false",
    });

    const result = await getCompaniesWithMeta();

    expect(result.companies).toEqual([]);
  });
});

describe("getLiveJobsComparison / getLiveJobsTotal", () => {
  it("liveJobsComparison이 성공하면 그 값을 기준으로 매핑한다", async () => {
    mockApi.liveJobsComparison.mockResolvedValue({
      jobListTotal: 100,
      jobListEnvTotal: 80,
      missingEnvCount: 20,
      missingEnvRate: 20,
    });
    const { getLiveJobsComparison } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getLiveJobsComparison();

    expect(result).toEqual({
      jobListTotal: 100,
      jobListEnvTotal: 80,
      jobListResultCode: "0000",
      jobListEnvResultCode: "0000",
    });
  });

  it("liveJobsComparison이 실패하면 KEAD 비교로 폴백한다", async () => {
    mockApi.liveJobsComparison.mockRejectedValue(new Error("down"));
    mockGetKeadJobComparison.mockResolvedValue({
      jobListTotal: 5,
      jobListEnvTotal: 5,
      jobListResultCode: "0000",
      jobListEnvResultCode: "0000",
    });
    const { getLiveJobsComparison } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getLiveJobsComparison();

    expect(result.jobListTotal).toBe(5);
  });

  it("getLiveJobsTotal: 백엔드 비교 수치가 있으면 그것을 쓴다", async () => {
    mockApi.liveJobsComparison.mockResolvedValue({
      jobListTotal: 50,
      jobListEnvTotal: 40,
      missingEnvCount: 10,
      missingEnvRate: 20,
    });
    const { getLiveJobsTotal } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    expect(await getLiveJobsTotal()).toBe(40);
  });

  it("getLiveJobsTotal: 백엔드 수치가 0이고 KEAD에 공고가 있으면 KEAD 비교로 계산한다", async () => {
    mockApi.liveJobsComparison.mockResolvedValue({
      jobListTotal: 0,
      jobListEnvTotal: 0,
      missingEnvCount: 0,
      missingEnvRate: 0,
    });
    mockGetMergedKeadJobs.mockResolvedValue([makeJob("k1")]);
    mockGetKeadJobComparison.mockResolvedValue({
      jobListTotal: 7,
      jobListEnvTotal: 6,
      jobListResultCode: "0000",
      jobListEnvResultCode: "0000",
    });
    const { getLiveJobsTotal } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    expect(await getLiveJobsTotal()).toBe(6);
  });

  it("getLiveJobsTotal: 모든 소스가 실패하면 mock 폴백 허용 여부에 따라 개수를 반환한다", async () => {
    mockApi.liveJobsComparison.mockRejectedValue(new Error("down"));
    mockApi.liveJobsTotal.mockRejectedValue(new Error("down"));
    mockApi.jobs.mockRejectedValue(new Error("down"));
    const { getLiveJobsTotal } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "production",
      NEXT_PUBLIC_ALLOW_MOCK_FALLBACK: "false",
    });

    expect(await getLiveJobsTotal()).toBe(0);
  });
});

describe("getLiveJobsTotalWithMeta — 실시간/추정 source 태깅", () => {
  it("백엔드 비교 수치가 있으면 source는 live다", async () => {
    mockApi.liveJobsComparison.mockResolvedValue({
      jobListTotal: 50,
      jobListEnvTotal: 40,
      missingEnvCount: 10,
      missingEnvRate: 20,
    });
    const { getLiveJobsTotalWithMeta } = await loadData({ NEXT_PUBLIC_API_URL: "http://localhost:8000" });

    const result = await getLiveJobsTotalWithMeta();

    expect(result).toEqual({ total: 40, source: "live" });
  });

  it("모든 실데이터 소스가 실패해 mock 개수로 폴백하면 source는 static이다", async () => {
    mockApi.liveJobsComparison.mockRejectedValue(new Error("down"));
    mockApi.liveJobsTotal.mockRejectedValue(new Error("down"));
    mockApi.jobs.mockRejectedValue(new Error("down"));
    const { getLiveJobsTotalWithMeta } = await loadData({
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NODE_ENV: "development",
    });

    const result = await getLiveJobsTotalWithMeta();

    expect(result.source).toBe("static");
  });
});
