from datetime import datetime, timezone

from fastapi import APIRouter

from app.schemas.job import Job, JobListResponse
from app.schemas.live_job import LiveJobMergedResponse, LiveJobResponse, LiveJobWithEnvResponse
from app.services.data_service import get_jobs_data
from app.services.live_job_service import (
    fetch_live_jobs,
    fetch_live_jobs_comparison,
    fetch_live_jobs_merged,
    fetch_live_jobs_with_env,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
def list_jobs() -> JobListResponse:
    # 로컬 시드 데이터(jobs.json)만 반환하는 정적 폴백 경로 — 항상 source="static"
    return JobListResponse(
        source="static",
        syncedAt=datetime.now(timezone.utc).isoformat(),
        data=[Job(**job) for job in get_jobs_data()],
    )


@router.get("/live", response_model=LiveJobResponse)
def list_live_jobs(pageNo: int = 1, numOfRows: int = 20) -> LiveJobResponse:
    result = fetch_live_jobs(page_no=pageNo, num_of_rows=numOfRows)
    return LiveJobResponse(**result)


@router.get("/live-with-env", response_model=LiveJobWithEnvResponse)
def list_live_jobs_with_env(pageNo: int = 1, numOfRows: int = 20) -> LiveJobWithEnvResponse:
    result = fetch_live_jobs_with_env(page_no=pageNo, num_of_rows=numOfRows)
    return LiveJobWithEnvResponse(**result)


@router.get("/live-merged", response_model=LiveJobMergedResponse)
def list_live_jobs_merged(pageNo: int = 1, numOfRows: int = 20) -> LiveJobMergedResponse:
    result = fetch_live_jobs_merged(page_no=pageNo, num_of_rows=numOfRows)
    return LiveJobMergedResponse(**result)


@router.get("/live-comparison")
def live_jobs_comparison(pageNo: int = 1, numOfRows: int = 1) -> dict[str, float | int]:
    return fetch_live_jobs_comparison(page_no=pageNo, num_of_rows=numOfRows)
