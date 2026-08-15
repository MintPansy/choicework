import { createHash } from "node:crypto";

import { Job } from "@/types";

type KeadHeader = {
  resultMsg?: string;
  resultCode?: string;
};

type KeadBody<T> = {
  items?: {
    item?: T | T[];
  };
  numOfRows?: number | string;
  pageNo?: number | string;
  totalCount?: number | string;
};

type KeadResponse<T> = {
  response?: {
    header?: KeadHeader;
    body?: KeadBody<T>;
  };
};

type JobListItem = {
  termDate?: string;
  busplaName?: string;
  cntctNo?: string;
  compAddr?: string;
  empType?: string;
  enterType?: string;
  jobNm?: string;
  offerregDt?: string;
  regDt?: string;
  regagnName?: string;
  reqCareer?: string;
  reqEduc?: string;
  rno?: string;
  rnum?: string;
  salary?: string;
  salaryType?: string;
};

type JobListEnvItem = JobListItem & {
  envBothHands?: string;
  envEyesight?: string;
  envHandwork?: string;
  envLiftPower?: string;
  envLstnTalk?: string;
  envStndWalk?: string;
};

function normalizeItems<T>(item: T | T[] | undefined): T[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(/,/g, "")) || 0;
  return 0;
}

function mapEmploymentType(raw: string | undefined): string {
  if (!raw) return "기타";
  const normalized = raw.trim();
  const map: Record<string, string> = {
    상용직: "정규직",
    임시직: "계약직",
    일용직: "일용직",
  };
  return map[normalized] ?? normalized;
}

function extractRegion(address: string | undefined): string {
  if (!address) return "지역 미상";
  const tokens = address.split(" ").filter(Boolean);
  if (tokens.length === 0) return "지역 미상";
  return tokens.slice(0, 2).join(" ");
}

function formatSalary(salary: string | undefined, salaryType: string | undefined): string | undefined {
  if (!salary || !salaryType) return undefined;
  const numeric = Number(salary.replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  const manwon = Math.round(numeric / 10000);
  return `${salaryType} ${manwon.toLocaleString()}만원`;
}

function generateTags(item: JobListEnvItem): string[] {
  const tags: string[] = [];
  if (item.enterType?.includes("신입") || item.enterType?.includes("무관")) tags.push("신입 환영");
  if (item.envStndWalk && !item.envStndWalk.includes("오랫동안 가능")) tags.push("장시간 서기 부담 낮음");
  if (item.envEyesight && !item.envEyesight.includes("아주 작은 글씨")) tags.push("시력 요구 부담 낮음");
  if (item.envLstnTalk && !item.envLstnTalk.includes("어려움 없음")) tags.push("청취/대화 부담 낮음");
  if (!item.envLiftPower || !item.envLiftPower.includes("20Kg")) tags.push("중량물 부담 낮음");
  return tags;
}

/** 백엔드 live_job_service._stable_id와 동일한 알고리즘(같은 필드·같은 SHA-1 앞 16자). 백엔드를 거치지 않는 이 경로에서도 동일 공고가 동일 id를 갖도록 함 */
export function stableJobId(item: {
  busplaName?: string;
  jobNm?: string;
  offerregDt?: string;
  cntctNo?: string;
  regDt?: string;
  compAddr?: string;
}): string {
  const key = [
    item.busplaName ?? "",
    item.jobNm ?? "",
    item.offerregDt ?? "",
    item.cntctNo ?? "",
    item.regDt ?? "",
    item.compAddr ?? "",
  ].join("|");
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

function mapItemToJob(item: JobListEnvItem, index: number): Job {
  return {
    id: stableJobId(item) || String(index),
    title: item.jobNm || "직무명 없음",
    companyName: item.busplaName || "기업명 없음",
    location: extractRegion(item.compAddr),
    employmentType: mapEmploymentType(item.empType),
    accessibilityTags: generateTags(item),
    salaryRange: formatSalary(item.salary, item.salaryType),
    salaryType: item.salaryType,
    recruitmentPeriod: item.termDate,
    entryType: item.enterType,
    requiredCareer: item.reqCareer,
    requiredEducation: item.reqEduc,
    agencyName: item.regagnName,
    contactNumber: item.cntctNo,
    applicationDate: item.offerregDt,
    envBothHands: item.envBothHands,
    envEyesight: item.envEyesight,
    envHandwork: item.envHandwork,
    envLiftPower: item.envLiftPower,
    envLstnTalk: item.envLstnTalk,
    envStndWalk: item.envStndWalk,
  };
}

async function fetchKeadJobEndpoint<T extends JobListItem>(
  endpoint: "job_list" | "job_list_env",
  params: { pageNo: number; numOfRows: number; serviceKey: string }
): Promise<{ resultCode: string; resultMsg: string; totalCount: number; items: T[] }> {
  const url = new URL(`https://apis.data.go.kr/B552583/job/${endpoint}`);
  url.searchParams.set("serviceKey", params.serviceKey);
  url.searchParams.set("pageNo", String(params.pageNo));
  url.searchParams.set("numOfRows", String(params.numOfRows));
  url.searchParams.set("_type", "json");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    return { resultCode: String(response.status), resultMsg: "HTTP Error", totalCount: 0, items: [] };
  }

  const payload = (await response.json()) as KeadResponse<T>;
  const header = payload.response?.header;
  const body = payload.response?.body;
  return {
    resultCode: header?.resultCode ?? "UNKNOWN",
    resultMsg: header?.resultMsg ?? "Unknown",
    totalCount: toNumber(body?.totalCount),
    items: normalizeItems(body?.items?.item),
  };
}

export async function getMergedKeadJobs(pageNo = 1, numOfRows = 50): Promise<Job[]> {
  const serviceKey = process.env.ODCLOUD_SERVICE_KEY;
  if (!serviceKey) return [];

  try {
    const buildMergeKey = (item: JobListItem) =>
      [
        item.busplaName ?? "",
        item.jobNm ?? "",
        item.offerregDt ?? "",
        item.cntctNo ?? "",
        item.regDt ?? "",
        item.compAddr ?? "",
      ].join("|");

    const fetchPaged = async <T extends JobListItem>(
      endpoint: "job_list" | "job_list_env"
    ): Promise<{ resultCode: string; resultMsg: string; totalCount: number; items: T[] }> => {
      const first = await fetchKeadJobEndpoint<T>(endpoint, { pageNo, numOfRows: 100, serviceKey });
      if (first.resultCode !== "0000") return first;

      const maxPagesByTarget = Math.max(1, Math.ceil(numOfRows / 100));
      const maxPagesByTotal = Math.max(1, Math.ceil(first.totalCount / 100));
      const pageCount = Math.min(5, Math.max(maxPagesByTarget, Math.min(3, maxPagesByTotal)));
      if (pageCount === 1) {
        return { ...first, items: first.items.slice(0, numOfRows) };
      }

      const extraCalls: Promise<{ resultCode: string; resultMsg: string; totalCount: number; items: T[] }>[] = [];
      for (let p = pageNo + 1; p < pageNo + pageCount; p += 1) {
        extraCalls.push(fetchKeadJobEndpoint<T>(endpoint, { pageNo: p, numOfRows: 100, serviceKey }));
      }
      const extra = await Promise.all(extraCalls);
      const mergedItems = [
        ...first.items,
        ...extra.filter((result) => result.resultCode === "0000").flatMap((result) => result.items),
      ];
      return { ...first, items: mergedItems.slice(0, numOfRows) };
    };

    const [raw, env] = await Promise.all([
      fetchPaged<JobListItem>("job_list"),
      fetchPaged<JobListEnvItem>("job_list_env"),
    ]);

    if (env.resultCode !== "0000" && raw.resultCode !== "0000") return [];

    const rawMap = new Map<string, JobListItem>();
    for (const item of raw.items) {
      const key = buildMergeKey(item);
      rawMap.set(key, item);
    }

    const merged = env.items.map((envItem) => {
      const key = buildMergeKey(envItem);
      return {
        ...rawMap.get(key),
        ...envItem,
      };
    });

    return merged.map(mapItemToJob);
  } catch {
    return [];
  }
}

export async function getKeadJobComparison(pageNo = 1, numOfRows = 5): Promise<{
  jobListTotal: number;
  jobListEnvTotal: number;
  jobListResultCode: string;
  jobListEnvResultCode: string;
}> {
  const serviceKey = process.env.ODCLOUD_SERVICE_KEY;
  if (!serviceKey) {
    return {
      jobListTotal: 0,
      jobListEnvTotal: 0,
      jobListResultCode: "NO_KEY",
      jobListEnvResultCode: "NO_KEY",
    };
  }

  try {
    const [raw, env] = await Promise.all([
      fetchKeadJobEndpoint<JobListItem>("job_list", { pageNo, numOfRows, serviceKey }),
      fetchKeadJobEndpoint<JobListEnvItem>("job_list_env", { pageNo, numOfRows, serviceKey }),
    ]);
    return {
      jobListTotal: raw.totalCount,
      jobListEnvTotal: env.totalCount,
      jobListResultCode: raw.resultCode,
      jobListEnvResultCode: env.resultCode,
    };
  } catch {
    return {
      jobListTotal: 0,
      jobListEnvTotal: 0,
      jobListResultCode: "FETCH_ERROR",
      jobListEnvResultCode: "FETCH_ERROR",
    };
  }
}
