from pydantic import BaseModel


class Job(BaseModel):
    title: str
    companyName: str
    location: str
    employmentType: str
    accessibilityTags: list[str]


class JobListResponse(BaseModel):
    source: str
    syncedAt: str
    data: list[Job]
