import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 이용약관 — ChoiceWork",
  description:
    "ChoiceWork 서비스 이용약관. HUFS ACE Developers 운영 장애인·청년 구직자 취업 의사결정 플랫폼.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page">
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10 md:px-8 md:pt-12">
        <Link
          href="/"
          className="text-sm text-slate-500 transition hover:text-slate-800"
        >
          ← 홈으로
        </Link>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          ChoiceWork 서비스 이용약관
        </h1>
        <p className="mt-3 text-sm text-slate-500">시행일: 2026년 5월 13일</p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-slate-700 md:text-[15px]">
          <section>
            <h2 className="text-base font-bold text-slate-900">제1조 (목적)</h2>
            <p className="mt-3">
              본 약관은 ChoiceWork(이하 &quot;서비스&quot;)를 운영하는 HUFS ACE Developers(이하
              &quot;운영자&quot;)가 제공하는 서비스의 이용과 관련하여 운영자와 이용자 간의 권리, 의무 및
              책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제2조 (서비스의 내용)</h2>
            <p className="mt-3">
              ChoiceWork는 공공데이터와 AI 기술을 활용하여 장애인 및 청년 구직자가 자신에게 적합한
              일자리를 탐색하고 비교할 수 있도록 지원하는 취업 의사결정 플랫폼입니다.
            </p>
            <p className="mt-3">서비스는 다음과 같은 기능을 제공합니다.</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>장애인 구인 공고 조회</li>
              <li>기업 장애 친화도 정보 제공</li>
              <li>공공데이터 기반 맞춤 추천</li>
              <li>관심 공고 저장</li>
              <li>지역 생활 인프라 및 지원기관 정보 제공</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제3조 (회원가입 및 이용)</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                이용자는 이메일 기반 회원가입 또는 데모 계정을 통해 서비스를 이용할 수 있습니다.
              </li>
              <li>회원은 정확한 정보를 제공하여야 합니다.</li>
              <li>회원은 본인의 계정을 안전하게 관리할 책임이 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제4조 (회원의 의무)</h2>
            <p className="mt-3">이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>허위 정보 등록</li>
              <li>타인의 계정 도용</li>
              <li>서비스 운영 방해</li>
              <li>법령 또는 공공질서에 반하는 행위</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제5조 (서비스 제공 및 변경)</h2>
            <p className="mt-3">
              운영자는 서비스의 기능, 디자인 및 데이터 제공 방식을 변경할 수 있으며, 주요 변경 사항은
              서비스 내 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제6조 (면책사항)</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5">
              <li>
                서비스에서 제공하는 채용 정보 및 추천 결과는 공공데이터와 AI 분석을 기반으로
                제공되며, 최종 채용 결과를 보장하지 않습니다.
              </li>
              <li>
                운영자는 외부 공공데이터의 오류, 지연 또는 변경으로 인해 발생하는 문제에 대해 책임을
                지지 않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제7조 (회원 탈퇴)</h2>
            <p className="mt-3">회원은 언제든지 서비스 내 기능을 통해 탈퇴할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">제8조 (준거법)</h2>
            <p className="mt-3">본 약관은 대한민국 법률에 따라 해석되고 적용됩니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
