import { describe, expect, it } from "vitest";

import { stableJobId } from "../kead-jobs";

describe("stableJobId", () => {
  const base = {
    busplaName: "삼성전자",
    jobNm: "생산직",
    offerregDt: "20260101",
    cntctNo: "02-1234-5678",
    regDt: "20251201",
    compAddr: "경기 수원시",
  };

  it("동일한 공고 내용이면 항상 동일한 id를 만든다", () => {
    expect(stableJobId(base)).toBe(stableJobId({ ...base }));
  });

  it("공고 내용이 다르면 다른 id를 만든다", () => {
    expect(stableJobId(base)).not.toBe(stableJobId({ ...base, jobNm: "사무직" }));
  });

  it("16자리 고정 길이 문자열을 반환한다", () => {
    expect(stableJobId(base)).toHaveLength(16);
  });
});
