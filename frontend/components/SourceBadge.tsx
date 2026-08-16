interface SourceBadgeProps {
  source: "live" | "static";
  liveLabel?: string;
  staticLabel?: string;
  className?: string;
}

/** 백엔드가 응답에 실어 보내는 source("live" | "static")를 실시간/추정 배지로 노출한다.
 *  홈·추천·상세 페이지의 공고 데이터가 지금 실시간 공공데이터인지, 대체(정적) 데이터인지를 정직하게 표시하기 위함. */
export default function SourceBadge({
  source,
  liveLabel = "실시간 데이터",
  staticLabel = "추정 데이터",
  className = "",
}: SourceBadgeProps) {
  const isLive = source === "live";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        isLive
          ? "bg-primary-50 text-primary-900 ring-primary-200"
          : "bg-amber-50 text-amber-900 ring-amber-200"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-primary-600" : "bg-amber-500"}`}
      />
      {isLive ? liveLabel : staticLabel}
    </span>
  );
}
