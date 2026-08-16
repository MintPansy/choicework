from pydantic import BaseModel


class LiveJob(BaseModel):
    id: str = ""
    recruitmentPeriod: str = ""
    businessName: str = ""
    contactNumber: str = ""
    companyAddress: str = ""
    employmentType: str = ""
    entryType: str = ""
    jobName: str = ""
    applicationDate: str = ""
    registeredAt: str = ""
    agencyName: str = ""
    requiredCareer: str = ""
    requiredEducation: str = ""
    salaryType: str = ""
    salary: str = ""


class LiveJobWithEnv(LiveJob):
    envBothHands: str = ""
    envEyesight: str = ""
    envHandwork: str = ""
    envLiftPower: str = ""
    envLstnTalk: str = ""
    envStndWalk: str = ""
    # 근무환경 6축 기반 친화도 점수 (app.services.company_rating_service.compute_job_env_friendliness 단일 소스)
    friendlinessScore: int = 0


class LiveJobResponse(BaseModel):
    pageNo: int
    numOfRows: int
    totalCount: int
    data: list[LiveJob]
    # 이 엔드포인트는 실패 시 예외를 던지므로(내부 폴백 없음), 응답이 오면 항상 "live"
    source: str = "live"


class LiveJobWithEnvResponse(BaseModel):
    pageNo: int
    numOfRows: int
    totalCount: int
    data: list[LiveJobWithEnv]
    source: str = "live"


class LiveJobMergedMeta(BaseModel):
    requestedCount: int
    collectedPages: int
    rawCollectedCount: int
    envCollectedCount: int
    mergedCount: int
    mergeMatchRate: float
    rawTotalCount: int
    envTotalCount: int


class LiveJobMergedResponse(LiveJobWithEnvResponse):
    meta: LiveJobMergedMeta
