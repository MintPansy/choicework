import ScoreTooltip from "@/components/ScoreTooltip";
import BookmarkButton from "@/components/BookmarkButton";
import SourceBadge from "@/components/SourceBadge";
import { getJobByIdWithMeta } from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const ENV_LABELS: Record<string, string> = {
  envBothHands: "양손 사용",
  envEyesight: "시력",
  envHandwork: "손 작업",
  envLiftPower: "중량물 취급",
  envLstnTalk: "청취/대화",
  envStndWalk: "서기/걷기",
};

function formatDate(raw: string | number | undefined): string {
  if (raw == null || raw === "") return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 8) return String(raw);
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const { job, source } = await getJobByIdWithMeta(id);
  if (!job) return notFound();

  const envEntries = (
    [
      { label: ENV_LABELS.envBothHands, value: job.envBothHands },
      { label: ENV_LABELS.envEyesight,  value: job.envEyesight },
      { label: ENV_LABELS.envHandwork,  value: job.envHandwork },
      { label: ENV_LABELS.envLiftPower, value: job.envLiftPower },
      { label: ENV_LABELS.envLstnTalk,  value: job.envLstnTalk },
      { label: ENV_LABELS.envStndWalk,  value: job.envStndWalk },
    ] as { label: string; value: string | undefined }[]
  ).filter((e) => e.value);

  return (
    <div className="min-h-screen bg-page">
      <main className="mx-auto max-w-4xl px-6 pb-16 pt-8">
        {/* 뒤로가기 */}
        <Link
          href="/recommendations"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
        >
          ← 목록으로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800">
                {job.employmentType}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">{job.title}</h1>
              <p className="mt-2 text-lg font-medium text-slate-700">{job.companyName}</p>
              <p className="mt-1 text-sm text-slate-500">{job.location}</p>
              <div className="mt-3">
                <SourceBadge source={source} />
              </div>
            </div>
            <BookmarkButton storageKey={`job-${job.id}`} label="찜하기" />
          </div>

          {job.friendlinessScore != null && (
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-primary-100 bg-primary-50/50 px-4 py-3">
              <span className="text-sm font-semibold text-primary-900">
                접근성 점수 {job.friendlinessScore}점
              </span>
              <ScoreTooltip ariaLabel="접근성 점수 산정 안내" />
            </div>
          )}

          {/* 핵심 정보 그리드 */}
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {job.salaryRange && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <dt className="text-xs font-medium text-emerald-700">급여</dt>
                <dd className="mt-1 text-base font-bold text-emerald-950">{job.salaryRange}</dd>
              </div>
            )}
            {job.entryType && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">지원 자격</dt>
                <dd className="mt-1 text-base font-bold text-slate-900">{job.entryType}</dd>
              </div>
            )}
            {job.requiredCareer && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">경력</dt>
                <dd className="mt-1 text-base font-bold text-slate-900">{job.requiredCareer}</dd>
              </div>
            )}
            {job.requiredEducation && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">학력</dt>
                <dd className="mt-1 text-base font-bold text-slate-900">{job.requiredEducation}</dd>
              </div>
            )}
            {job.recruitmentPeriod && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">모집 마감</dt>
                <dd className="mt-1 text-base font-bold text-slate-900">{formatDate(job.recruitmentPeriod)}</dd>
              </div>
            )}
            {job.applicationDate && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">공고 등록일</dt>
                <dd className="mt-1 text-base font-bold text-slate-900">{formatDate(job.applicationDate)}</dd>
              </div>
            )}
          </dl>

          {/* 접근성 태그 */}
          {job.accessibilityTags.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">접근성 태그</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.accessibilityTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 근무환경 조건 */}
        {envEntries.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Work Environment
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">근무환경 조건</h2>
            <p className="mt-1 text-sm text-slate-500">
              장애 유형별 근무 가능 여부를 확인하세요.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {envEntries.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="text-sm font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 접수처 안내 */}
        {(job.agencyName || job.contactNumber) && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Contact</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">접수처 및 문의</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {job.agencyName && (
                <div>
                  <dt className="text-xs text-slate-500">담당 기관</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{job.agencyName}</dd>
                </div>
              )}
              {job.contactNumber && (
                <div>
                  <dt className="text-xs text-slate-500">연락처</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    <a
                      href={`tel:${job.contactNumber.replace(/[^0-9]/g, "")}`}
                      className="text-primary-700 hover:underline"
                    >
                      {job.contactNumber}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50/40 p-4 text-sm text-primary-900">
              한국장애인고용공단(1588-1519)을 통해 구직 상담 및 취업 지원 서비스를 받을 수 있습니다.
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              이 공고 정보를 바탕으로 공단 상담을 신청하면, 담당자가 지원금·적합 직무를 함께 안내해 줍니다.
            </p>
            <a
              href="https://www.kead.or.kr/view/service/service02_06.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              공단에 지원 상담 신청 →
            </a>
          </section>
        )}

        {/* 하단 CTA */}
        <div className="mt-10 space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            홈 하단 지원금 계산기에서는 예상 금액을 확인한 뒤 공단 신청 페이지로 이어지며, 필요 시 같은 공단 링크로 상담도 요청할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/recommendations"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              다른 일자리 보기
            </Link>
            <Link
              href="/#support"
              className="rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800"
            >
              지원금 계산하기
            </Link>
            <a
              href="https://www.kead.or.kr/view/service/service02_06.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              공단 지원 상담 신청 →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
