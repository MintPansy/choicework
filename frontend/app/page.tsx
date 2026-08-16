import { LandingHero } from "@/components/home/landing-sections";
import { getLiveJobsTotalWithMeta } from "@/lib/data";

export default async function HomePage() {
  const { total: liveJobsTotal, source } = await getLiveJobsTotalWithMeta();

  return (
    // 상단바(56px)를 제외한 화면 전체(calc(100vh-56px))를 최소 높이로 설정하여 화면에 꽉 차게 만듭니다.
    // w-full과 px-4 sm:px-6 코드가 모바일과 분할 화면에서도 좌우 여백을 예쁘게 잡아줍니다.
    <div className="flex min-h-[calc(100vh-56px)] w-full items-center justify-center pb-10">
      <div className="w-full mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
        <LandingHero liveJobsTotal={liveJobsTotal} source={source} />
      </div>
    </div>
  );
}