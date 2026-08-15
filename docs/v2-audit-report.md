# ChoiceWork v2 — Initial Development Audit Report

> `.claude/setting.md`의 1단계 지시에 따라 작성한 감사 보고서입니다. 이번 단계에서는 코드를 수정하지 않았으며, 아래 내용은 실제 코드/문서에서 확인한 사실과 그로부터의 추론을 구분해 서술합니다. "사실:"로 시작하지 않는 평가·판단성 문장은 감사자의 추론입니다.

---

## 1. Executive Summary

ChoiceWork는 Next.js(App Router) 16 + FastAPI로 구성된 모노레포이며, 공공데이터(한국장애인고용공단 구인/표준사업장, ODcloud 장려금, 경기도 활동지원기관)를 백엔드가 서버 사이드에서 호출·정규화해 프론트에 제공하는 구조를 이미 갖추고 있습니다. `docs/planning.md` 개발일지에 따르면 2026-04-30~05-02 시점에 8개 API·4개 페이지가 실데이터로 검증되었고, 이는 "MVP가 목업 수준"이라는 자기소개(README 서두 인용문)와 달리 실제로는 상당 부분 실데이터 연동까지 진행된 프로젝트임을 보여줍니다. 다만 로컬 저장소에는 `.env`/`.env.local`이 존재하지 않아 현재 이 체크아웃 상태에서 API 키가 유효한지는 확인할 수 없습니다. 프론트 아키텍처는 서버 컴포넌트를 기본으로 하고 필요한 곳만 클라이언트 컴포넌트로 분리하는 패턴을 대체로 지키고 있으나(`SiteHeader`/`SiteHeaderClient` 분리 등 양호한 사례 존재), 데이터 계층(`lib/data.ts`)에 API→KEAD 병합→목업으로 이어지는 다단계 폴백 로직이 몰려 있어 복잡도가 높습니다. 기업 친화도 점수 계산 로직이 Python(백엔드)과 TypeScript(프론트) 양쪽에 사람이 직접 동일하게 옮겨 적은 형태로 중복 구현되어 있는 점이 가장 두드러진 기술 부채입니다. `/community`는 도메인(구인/기업 데이터)과 완전히 분리된 로컬스토리지 전용 목업 기능으로, 백엔드·실사용자 개념이 전혀 없어 포트폴리오 관점에서 리스크가 될 수 있습니다. 자동화된 테스트는 프론트 0건, 백엔드 1개 파일(98줄)뿐이라 리팩터링 안전망이 약합니다. 전반적으로 "완전히 새로 설계해야 하는 시스템"이라기보다는, 검증된 데이터 파이프라인 위에서 데이터 계층 단순화·중복 제거·테스트 보강·접근성 정리를 단계적으로 얹는 편이 타당해 보입니다.

---

## 2. Current Architecture

```text
/  (monorepo)
├── frontend/  Next.js 16 (App Router) + React 19 + TS(strict) + Tailwind
│   ├── app/            라우트 (페이지 대부분 async Server Component)
│   ├── components/     UI 컴포넌트 (일부 "use client")
│   ├── lib/             데이터 계층·도메인 로직·포맷터
│   └── types/           공유 타입 정의 (types/index.ts 1곳에 집중)
├── backend/  FastAPI
│   ├── app/routers/     엔드포인트 (jobs, companies, accessibility, supports, incentives, standard_workplaces, health)
│   ├── app/services/    공공 API 호출·정규화·스코어링·캐싱
│   ├── app/schemas/     Pydantic 응답 모델
│   └── app/core/config.py  pydantic-settings 기반 환경변수
├── data/     참고용 mock JSON (companies/jobs/supports, 각 20~26줄)
└── docs/     기획·데이터·API·배포 문서 (planning.md에 상세 개발일지 존재)
```

### 라우트 트리 (frontend/app)

```text
/                              홈 (통계·통합검색·퀵카드)
/recommendations               장애 유형 필터 + 일자리 목록 (Server Component, GET form)
/companies                     기업 검색 (검색어 있을 때만 API 호출)
/company/[id]                  기업 상세
/job/[id]                      구인 상세
/jobs/regions                  시·도 → 시·군·구 단계 필터
/jobs/environment              근무환경 프리셋
/jobs/insights                 공고 분포·수집 요약
/jobs/domain/[slug]            도메인별 목록
/jobs/employment-types          고용형태별 안내
/support, /support/consulting, /support/gyeonggi-activity-support
/community                     로컬스토리지 목업 커뮤니티 ("use client" 전용)
/saved-jobs                    찜한 공고 (localStorage)
/gigs, /gigs/[id]               실험 라우트 (README상 메인 네비 미노출, "향후 확장")
/auth/login, /auth/demo-login, /auth/logout   데모 인증 (실제 계정 시스템 없음)
/about, /features, /guide, /terms, /privacy   정적 안내 페이지
/not-found                     커스텀 404
```

### 데이터 계층 호출 구조 (예: `/companies` 페이지)

```text
CompaniesPage (Server Component)
 ├─ CompaniesSearchBar (Client, 검색어 입력)
 └─ CompanyListSection (Server)
     └─ CompanyScoreCard × N
         ├─ RatingBreakdownPanel
         ├─ ScoreTooltip
         └─ BookmarkButton (Client, localStorage)
lib/data.ts → getCompaniesWithMeta()
 └─ lib/api.ts → fetch(`${BASE_URL}/companies`)
     └─ (실패 시) mockCompanies 폴백
```

재사용 컴포넌트로 평가할 만한 것: `JobCard`, `BookmarkButton`, `ScoreTooltip`, `RatingBreakdownPanel` — 단일 책임이 비교적 명확하고 여러 페이지에서 재사용됩니다. 반대로 `CommunityClient.tsx`(433줄)는 목록·상세·모달 2종·폼 3종 상태를 한 파일에서 모두 관리해 이번 코드베이스에서 가장 책임이 혼재된 파일입니다.

---

## 3. Data / API Architecture

### 사실: 사용 중인 공공데이터·엔드포인트

- **한국장애인고용공단 구인정보** (`data.go.kr` B552583 job API) — `/jobs/live` (raw), `/jobs/live-with-env` (근무환경 포함), `/jobs/live-merged` (raw+env 병합), `/jobs/live-comparison` (커버리지 비교). 구현: `backend/app/services/live_job_service.py`.
- **표준사업장 실시간 조회** — `backend/app/services/standard_workplace_service.py`. XML 태그명 불일치로 필드가 공백으로 오는 이슈가 `docs/planning.md`에 기록되어 있고(2026-04-30), 이후 태그 후보를 확장해 대응함(2026-05-02).
- **ODcloud 장려금 통계** — `backend/app/services/public_data_service.py` 계열, `/support/consulting`에서 사용.
- **경기도 Open API (장애인활동지원기관)** — `backend/app/services/accessibility_service.py`, 키 미설정 시 해당 기능만 빈 결과로 스킵되도록 설계됨(`backend/app/core/config.py`).

### 사실: 호출 위치와 인증

- 모든 외부 공공 API 호출은 **백엔드에서만** 발생합니다(`requests` 사용, `backend/app/services/*.py`). 프론트는 백엔드(`NEXT_PUBLIC_API_URL`)만 호출하며 공공 API 키를 프론트 코드/번들에 노출하지 않습니다. 이는 키 관리 관점에서 올바른 구조입니다.
- 인증키는 `pydantic-settings`로 `.env`에서 로드(`backend/app/core/config.py`). `DATA_GO_API_KEY` > `B552583_API_KEY`(레거시) > (job 조회 시) `ODCLOUD_API_KEY` 순으로 폴백하는 우선순위가 코드로 명시되어 있습니다.
- **사실:** 현재 저장소 체크아웃에는 `backend/.env`, `frontend/.env.local` 파일이 존재하지 않습니다(`ls` 결과 no such file). 즉 이 시점 기준으로 로컬에서 백엔드를 구동해도 API 키가 없어 502 에러를 반환하는 상태입니다(`live_job_service.py`가 키 부재 시 `HTTPException(500, ...)`을 던짐).
- **사실:** `docs/planning.md` 개발일지(2026-04-30~05-02)에는 동일 엔드포인트들이 각각 291건/265건/896건/281건의 실데이터로 PASS했다는 기록이 있습니다. 즉 API 자체와 인증 흐름은 과거 시점에 검증되었습니다.

### 데이터 흐름 (실제 구조 기준)

```text
Public Data API (data.go.kr, odcloud, gg.go.kr)
      ↓ (서버에서만 호출, requests + XML/JSON 파싱)
backend/app/services/*.py  (정규화 + 60초/30초 in-memory TTL 캐시)
      ↓ (Pydantic 스키마)
FastAPI 라우터 응답 (JSON)
      ↓ fetch (frontend/lib/api.ts, cache: "no-store")
프론트 매핑 함수 (mapLiveJobToJob 등) — 필드명 변환 + 파생 필드 계산(친화도 점수, 태그)
      ↓
frontend/lib/data.ts — API 실패 시 KEAD 병합 재시도 → mock 폴백까지 최대 3~4단계 캐스케이드
      ↓
Server Component (page.tsx)에서 필터링/정렬 수행 후 UI 컴포넌트에 props로 전달
```

필터링·정렬은 대부분 **UI 모델이 아니라 서버 컴포넌트 함수 내부**(`recommendations/page.tsx`의 `matchesFilter` 등)에서 요청마다 재계산되며, 별도 상태관리 라이브러리는 사용하지 않습니다. 검색 상태는 URL 쿼리스트링에 반영되어 공유 가능합니다(`/recommendations?region=...&disabilityType=...`).

**페이지네이션은 존재하지 않습니다.** `getJobs(60)`, `getCompaniesWithMeta()` → `getJobs(400)`(companies 검색), `getJobById`의 `getJobs(500)` 등 화면별로 임의의 대량 조회 후 클라이언트에서 전량 필터링하는 방식입니다. 백엔드 `/jobs/live-merged`는 페이지 파라미터를 지원하지만 프론트에서 스크롤/페이지 UI로 노출하지 않습니다.

캐싱은 **백엔드에만** 있습니다(`_MERGED_CACHE`, `_COMPARISON_CACHE`, TTL 60s/30s, 프로세스 인메모리 dict). 프론트 `fetch`는 `cache: "no-store"`로 매 요청 무효화됩니다. 인메모리 캐시는 서버 재시작 시 초기화되고 다중 인스턴스 배포 시 인스턴스별로 따로 유지된다는 한계가 있습니다(추론: 현재 트래픽 규모에서는 문제가 되지 않을 가능성이 높음).

에러/로딩/빈 상태: 백엔드는 `HTTPException`으로 명확한 상태 코드를 반환합니다. 프론트는 `lib/data.ts`에서 모든 API 에러를 30초 쿨다운과 함께 조용히 흡수하고 mock/빈 배열로 대체하는 전략을 취합니다 — 사용자에게 "지금 실데이터가 아니다"라는 안내는 기본적으로 노출되지 않습니다(`/companies`의 `badgeLabel`처럼 일부 화면에만 소스 표시 UI가 있음). `docs/frontend-improvements.md`에도 동일 문제(“API 실패 시 페이지 전체가 깨질 수 있음”, “mock 표시 중 안내 없음”)가 이미 팀 자체적으로 기록되어 있습니다.

---

## 4. Public Data API Reusability

**판단: ChoiceWork v2에서도 기존 공공데이터 API 연동 구조를 그대로 재사용하는 것이 타당합니다. 완전히 새 API 조사나 재설계는 불필요합니다.**

근거:

1. **사실** 백엔드 서비스 코드(`live_job_service.py`, `standard_workplace_service.py`, `accessibility_service.py`, `public_data_service.py`)가 이미 존재하고, 요청/파싱/정규화/에러 처리/캐싱까지 구현되어 있습니다.
2. **사실** `docs/planning.md`에 이 API들이 과거 실데이터로 정상 동작했다는 기록이 있습니다.
3. **사실** 현재는 `.env` 파일이 없어 로컬에서 바로 값을 확인할 수 없습니다. → **B. 케이스**: 키를 다시 채워 넣기만 하면 되는지, 만료되어 재발급이 필요한지는 코드만으로는 판단 불가하며, `data.go.kr`/`data.gg.go.kr` 콘솔에서 키 상태를 확인해야 합니다(이번 단계에서는 확인하지 않았습니다 — 지시사항에 따라 API를 호출하거나 키를 발급받지 않았습니다).
4. 표준사업장 API는 XML 태그명이 문서화와 다르게 오는 문제가 실측된 바 있어(`docs/planning.md`), 향후 응답이 다시 바뀔 가능성에 대비해 필드 매핑을 좀 더 방어적으로(태그 후보 배열 유지) 관리할 필요가 있습니다 — 이는 이미 부분적으로 반영되어 있습니다.
5. 정적 데이터(`data/*.json`, `frontend/lib/mockData.ts`)는 **폴백/데모용**으로만 존재하며 서비스의 주 데이터 소스가 아닙니다(C 케이스에 해당하지 않음).

**결론**: v2 개발 착수 시 가장 먼저 할 일은 새 API를 찾는 것이 아니라, `backend/.env.example` 기준으로 `.env`를 복구하고 `DATA_GO_API_KEY`(또는 `B552583_API_KEY`) 유효성을 `data.go.kr` 마이페이지에서 확인하는 것입니다. 이는 코드 감사 범위를 벗어나므로 이번 보고서는 판단 근거만 제시합니다.

---

## 5. Frontend Architecture

- **App Router 사용 방식**: 사실상 모든 페이지가 `async function Page()` 형태의 Server Component이며, `searchParams`를 Next 16 방식(`Promise`)으로 올바르게 `await`하고 있습니다(`recommendations/page.tsx`, `companies/page.tsx` 등). 이는 `docs/planning.md`에 Next.js 15+ 대응 버그로 기록된 이슈가 실제로 수정 반영된 상태임을 코드에서 확인했습니다.
- **Server/Client 분리**: 상호작용이 필요한 부분만 `"use client"`로 분리하는 패턴이 일관됩니다. 대표 사례로 `SiteHeader.tsx`(Server, 쿠키 읽기) → `SiteHeaderClient.tsx`(Client, `usePathname` 등 상호작용)로 나눈 구조는 이 프로젝트에서 가장 모범적인 컴포넌트 설계로 평가됩니다.
- **상태 관리**: 별도 전역 상태 라이브러리 없음. 로컬 UI 상태는 `useState`, 영속 상태(찜, 커뮤니티 글)는 `localStorage` 직접 사용. 프로젝트 규모상 과도한 설계는 아니지만, `localStorage` 접근이 `BookmarkButton`, `SavedJobsClient`, `CommunityClient` 등 여러 곳에 개별적으로 흩어져 있어 공통 유틸로 묶이지 않은 점은 있습니다.
- **API 계층/데이터 계층 분리**: `lib/api.ts`(순수 HTTP 클라이언트 + 응답 매핑)와 `lib/data.ts`(폴백·캐시·비즈니스 판단)로 나뉘어 있는 것 자체는 합리적인 레이어링입니다. 다만 `lib/data.ts`(332줄) 안에 **fetch 우선순위 판단, 재시도, 30초 쿨다운, mock 폴백, KEAD 병합**이라는 5가지 이상의 관심사가 함수마다 반복되는 유사한 try/catch 캐스케이드로 섞여 있어, 새 데이터 소스를 추가할 때마다 각 함수를 동일한 패턴으로 손으로 늘려야 하는 구조입니다.
- **도메인 로직 vs UI 로직**: `computeAccessibilityScore`(프론트 `lib/api.ts`)처럼 점수 계산 같은 도메인 로직이 API 매핑 함수 안에 섞여 있고, 동일 로직이 백엔드 `company_rating_service.py`의 `compute_job_env_friendliness`에도 **의도적으로 동일하게 복제**되어 있습니다(백엔드 코드 주석: "프론트 mapLiveJobToJob의 computeAccessibilityScore와 동일한 룰"). 이는 두 언어로 사람이 직접 동기화해야 하는 구조로, 규칙이 하나만 바뀌어도 점수 불일치가 발생할 수 있습니다.
- **TypeScript 활용**: `strict: true`, grep 결과 `any`/`as any` 사용 0건으로 타입 안전성은 양호합니다. 도메인 타입은 `types/index.ts` 한 곳에 모여 있어 API 응답 타입(`LiveJobItem` 등, `lib/api.ts`에 로컬 정의)과 화면 표시 타입(`Job`)이 실질적으로는 분리되어 있으나, 이는 `docs/frontend-improvements.md`에서 팀이 이미 인지한 개선 항목이기도 합니다.
- **에러 처리**: 백엔드는 HTTP 상태 코드 기반으로 명확. 프론트는 에러를 삼키고 폴백하는 전략 일변도라, 실패 원인(키 없음/네트워크 오류/외부 API 오류)이 사용자에게도, 개발자 콘솔 외에는 로그로도 잘 드러나지 않습니다.
- **폼 처리**: 커스텀 라이브러리 없이 네이티브 `<form action="..." method="get">` 사용(`recommendations`) — App Router 철학에 부합하고 JS 없이도 동작하는 점에서 긍정적입니다.
- **URL state**: 검색 필터가 쿼리스트링에 반영되어 공유 가능하나, `/recommendations`(자유 텍스트 `region` input)와 `/jobs/regions`(시·도→시·군·구 단계 select)가 **서로 다른 지역 입력 방식**을 사용해 동일 개념(지역)의 UX가 페이지마다 다릅니다.

**질문에 대한 답**: 현재 구조는 프로젝트가 지금 규모(라우트 30개 내외, 서비스 로직 대부분 소규모 파일)에서는 유지보수 가능한 수준입니다. 다만 데이터 소스가 늘어나거나(전국 확장 등) 팀원이 늘어날 경우, `lib/data.ts`의 캐스케이드 로직과 점수 계산 이중 구현은 병목이 될 가능성이 높습니다(추론).

---

## 6. UX / Accessibility

WCAG 관점에서 관찰된 사실과, 그로부터의 추론을 구분해 정리합니다.

| 항목 | 관찰 (사실) | 평가 |
|---|---|---|
| Semantic HTML | `CompanyScoreCard`가 `<article>`, `<dl>/<dt>/<dd>` 사용. `recommendations`는 `<form>`, `<label>`, 네이티브 `<select>` 사용 | 양호한 부분 |
| Heading 구조 | 페이지별로 `<h1>`(recommendations), `<h2>`(커뮤니티 상세) 존재 확인. 전체 페이지 전수 조사는 이번 단계에서 수행하지 않음 | 추가 전수 점검 필요 |
| Focus visibility | 다수 인터랙티브 요소에 `focus-visible:ring-2` 패턴 일관 적용(`SiteHeaderClient`, `CommunityClient` 로그인 모달, `recommendations` input 등) | 양호한 부분 |
| Keyboard 조작 | 커뮤니티 댓글 삭제 요소가 `role="button" tabIndex={0}` + `onKeyDown`(Enter/Space)으로 키보드 접근 가능하게 구현됨. 로그인 모달은 `Escape` 키로 닫힘 처리(`useEffect` keydown 핸들러) | 양호한 부분 |
| Dialog 시맨틱 | 로그인 모달에 `role="dialog" aria-modal="true" aria-labelledby`가 지정되어 있음. 단, 모달 오픈 시 포커스를 모달 내부로 이동시키는 focus trap/초기 포커스 지정 코드는 확인되지 않음 | 개선 여지 (추론: 스크린리더/키보드 사용자가 모달이 열려도 포커스가 배경에 남아있을 수 있음) |
| 아이콘 버튼 | 헤더의 관심공고/검색 버튼이 이모지 글리프(♥, 🔍)를 텍스트로 사용하며 `aria-label`은 지정되어 있음 | 낮은 리스크지만, 이모지는 OS/폰트별 렌더링이 달라 시각적 일관성이 떨어질 수 있음 |
| 이미지 대체텍스트 | 로고 이미지는 `alt=""`(부모 링크에 `aria-label` 존재)로 처리, 사용자 프로필 이미지는 `alt="${name} 프로필"` | 적절한 처리 |
| 폼 접근성 | select/input에 `label`/`aria-label` 대부분 존재. 커뮤니티 "게시판 선택" select는 `label htmlFor` + `aria-label` 중복 지정(과잉이지만 해는 없음) | 양호 |
| 색 대비 / 폰트 스케일링 | 코드 상 자동 측정 불가. Tailwind 커스텀 팔레트(`primary-*`, `emerald-*`) 값 자체의 대비 계산은 이번 단계에서 수행하지 않음 | **추측 금지 원칙에 따라 미판정** — 별도 대비 점검 필요 |
| 터치 타깃 크기 | 헤더 아이콘 버튼이 `h-9 w-9`(36px) — WCAG 2.1 AA 권장 44px에는 다소 못 미침 | 개선 후보 |
| 로딩/빈 상태 접근성 | 검색 결과 없음 상태에 텍스트 안내는 있으나 `aria-live` 등으로 스크린리더에 결과 변경을 알리는 처리는 확인되지 않음 | 개선 후보 |
| 모션/애니메이션 | `animate-in fade-in slide-in-from-bottom-4` 등 사용, `prefers-reduced-motion` 대응 여부는 확인되지 않음 | 개선 후보 |

**질문에 대한 답**: ChoiceWork가 장애인 구직자를 주 대상으로 한다는 점을 고려하면, 위 표의 "개선 후보" 항목들(모달 focus trap, 터치 타깃, reduced-motion, aria-live)은 일반적인 소비자용 서비스보다 우선순위를 높게 잡을 이유가 있습니다. 반대로 이미 갖춰진 것(네이티브 폼 요소, focus-visible, 키보드 핸들러, dialog 시맨틱)은 다시 손댈 필요가 없습니다.

---

## 7. Search & Job Discovery UX

```text
홈 → 검색/필터(/recommendations) → 검색 결과(같은 페이지) → 공고 선택(JobCard) → 상세(/job/[id]) → 지원 판단(외부 공단 링크)
```

- **명확성**: `/recommendations`는 필터 미선택 시 안내 문구(`FILTER_NEUTRAL_HINT`)가, 장애 유형 선택 시 해당 유형에 특화된 설명(`DISABILITY_FILTER_COPY`)이 노출되어 "무엇을 해야 하는지"가 비교적 명확합니다.
- **URL 공유**: GET 폼이라 필터 조건이 그대로 URL에 남아 공유 가능합니다(장점).
- **필터 구조**: 장애 유형(5종) / 지역(자유 텍스트) / 고용형태(3종) / 키워드, 총 4개 — 과다하지 않은 수준입니다. 다만 지역이 자유 텍스트 입력이라 `/jobs/regions`의 단계형 선택 UX와 불일치하고, 오탈자·행정구역 표기 차이(예: "경기" vs "경기도")에 취약합니다(코드상 `job.location.includes(region)` 단순 포함 검사).
- **정렬**: 정렬 옵션 UI는 확인되지 않았습니다(등록순/최신순 등 명시적 sort 컨트롤 없음, 추론: 백엔드/프론트 모두 정렬 로직 없이 API 응답 순서를 그대로 사용).
- **결과 없음 처리**: "조건에 맞는 공고가 없습니다" + 필터 초기화 링크로 적절히 처리됨.
- **모바일**: 헤더에 모바일 전용 "일자리" 바로가기 링크가 있고 grid가 반응형(`md:grid-cols-2 xl:grid-cols-3`)이나, 실제 기기/뷰포트 테스트는 이번 단계에서 수행하지 않았습니다.
- **검색 상태 유지**: 페이지 이동(공고 상세 → 뒤로가기) 시 URL 쿼리스트링 덕분에 필터가 유지됩니다(브라우저 히스토리 기반, 장점).

---

## 8. Performance

코드 구조상 잠재적인 문제로, 실측치 없이 추측하지 않고 코드 근거가 있는 항목만 정리합니다.

- **불필요하게 큰 조회량**: `getJobs(60)`(추천), `getJobs(400)`(기업 검색 시 job pool 병합), `getJobs(500)`(`getCompanyById` fallback) 등 화면 하나를 그리기 위해 수백 건을 백엔드에 요청하고 프론트에서 필터링합니다. 백엔드가 페이지당 최대 100건씩 최대 5페이지(500건)를 순차 조회하도록 되어 있어(`live_job_service.py`의 `fetch_live_jobs_merged`), 요청 하나가 외부 공공 API를 최대 10회(raw+env × 5페이지) 호출할 수 있는 구조입니다.
- **캐싱 범위**: 백엔드 캐시는 `(page_no, num_of_rows)` 조합별 TTL 60초 인메모리 dict입니다. 조회량이 페이지마다 다르면(60/400/500) 캐시 키가 달라져 캐시 적중률이 낮아질 수 있습니다.
- **클라이언트 필터링 비용**: 서버가 받은 수백 건을 매 요청마다 `Array.filter`로 재계산합니다(요청량 자체는 크지 않아 현재 규모에서는 문제가 크지 않을 가능성이 높음 — 추론).
- **정적 자산**: 로고 이미지에 `next/image` + `priority`를 사용해 최적화 관행은 따르고 있습니다.
- **번들/클라이언트 컴포넌트 비중**: "use client" 파일 수가 많지 않고 대부분 페이지가 Server Component라 클라이언트 번들 크기 문제는 상대적으로 낮은 우선순위로 보입니다(추론, 실측 없음).
- **불필요한 상태/리렌더**: `CommunityClient`가 `posts` 배열 전체를 `useState`로 들고 매 변경마다 `JSON.stringify` 후 `localStorage.setItem`을 호출합니다(게시글 수가 적어 현재는 문제가 되지 않을 가능성이 높음 — 추론).

---

## 9. Technical Debt

### Critical

```text
Problem: 구인 상세 ID가 API 응답 배열의 인덱스로 결정됨 (id = String(index))
Location: frontend/lib/api.ts (mapLiveJobToJob), frontend/lib/data.ts (getJobById)
Why it matters: 외부 API 응답 순서가 바뀌면 동일 ID가 다른 공고를 가리키게 됨. 찜(BookmarkButton)·저장(saved-jobs)이 storageKey로 이 ID를 그대로 사용하므로, 사용자가 저장한 공고가 조용히 다른 공고로 바뀔 수 있음
Potential impact: 사용자가 신뢰하는 "저장한 공고" 기능이 은근히 깨짐 — 팀도 이미 인지한 이슈(docs/planning.md, Phase1 기술부채 항목)
Recommended direction: 외부 API의 안정적 필드(rno 등, 존재 여부 확인 필요)를 ID로 채택하거나, 최소한 병합 키(businessName+jobName+applicationDate 조합, 이미 backend _merge_key에 존재)를 프론트까지 노출해 ID로 사용
Priority: P0 (v2 데이터 계층 재설계 시 최우선 반영)
```

### High

```text
Problem: 기업 친화도/근무환경 점수 계산 로직이 Python·TypeScript 양쪽에 수동으로 동일하게 복제됨
Location: backend/app/services/company_rating_service.py (compute_job_env_friendliness) ↔ frontend/lib/api.ts (computeAccessibilityScore)
Why it matters: 코드 주석이 "동일한 룰"임을 명시할 정도로 팀도 인지하고 있으나, 언어가 달라 자동 동기화 수단이 없음. 규칙 하나만 바뀌어도 프론트/백엔드 점수가 어긋날 수 있음
Potential impact: 서비스 핵심 지표(친화도 점수)의 신뢰도 저하
Recommended direction: 점수 계산을 백엔드 단일 소스로 통합하고 프론트는 항상 API 응답값만 사용(현재도 회사 카드는 이미 그렇게 하고 있어 보임 — job 카드 쪽만 정리하면 됨)
Priority: P1
```

```text
Problem: frontend/lib/data.ts에 API→KEAD 병합→mock으로 이어지는 3~4단계 try/catch 폴백이 함수마다 반복됨
Location: frontend/lib/data.ts (getJobs, getJobById, getLiveJobsTotal 등)
Why it matters: 각 함수가 동일 패턴을 손으로 반복하고 있어 새 데이터 소스 추가/정책 변경 시 여러 곳을 동시에 고쳐야 함. 테스트 코드가 없어 변경 시 회귀를 잡기 어려움
Potential impact: 데이터 계층 변경의 비용과 위험이 계속 커짐
Recommended direction: 폴백 우선순위를 선언적 배열/전략 패턴으로 추출해 함수당 반복을 줄이고, 최소한 이 계층에는 단위 테스트 추가
Priority: P1
```

```text
Problem: 프론트엔드 테스트 0건, 백엔드 테스트 1개 파일(98줄)만 존재
Location: frontend/ 전체, backend/tests/test_api.py
Why it matters: 리팩터링(특히 위 두 항목)을 안전하게 수행할 안전망이 없음
Potential impact: v2 개선 작업 중 회귀 발생 가능성이 코드 리뷰만으로는 걸러지기 어려움
Recommended direction: 데이터 계층(lib/data.ts, lib/job-regions.ts, lib/disability-match.ts 등 순수 함수 위주)부터 단위 테스트 도입
Priority: P1
```

```text
Problem: /community가 백엔드·실사용자 개념 없이 완전히 로컬스토리지 목업으로 동작하며 도메인(구인/기업)과 단절되어 있음
Location: frontend/app/community/CommunityClient.tsx (433줄, 하드코딩 초기 게시글 10건 포함)
Why it matters: 헤더 내비게이션에 "동네 커뮤니티"로 노출되어 실제 서비스 기능처럼 보이지만 실질적으로는 목업이며, 새 글도 기기 로컬에만 저장됨(다른 사용자에게 보이지 않음)
Potential impact: 포트폴리오 심사자가 실제로 작동하는지 확인할 경우 "가짜 기능"으로 비칠 위험. 서비스 핵심 가치(공공데이터 기반 의사결정)와도 방향이 다름
Recommended direction: v2 스코프에 포함할지 여부를 먼저 결정 — 제외하거나, 포함한다면 최소한의 백엔드 저장소를 붙여 "동작하는 기능"으로 만들 것. 이번 단계에서는 결정만 필요(섹션 11 참고)
Priority: P1 (결정 자체의 우선순위이며, 구현 우선순위는 아님)
```

### Medium

```text
Problem: 지역 필터 UX가 페이지마다 다름 (recommendations: 자유 텍스트, jobs/regions: 시·도→시·군·구 단계 선택)
Location: frontend/app/recommendations/page.tsx, frontend/lib/job-regions.ts, frontend/app/jobs/regions/page.tsx
Why it matters: 동일 개념(지역)에 대해 사용자가 서로 다른 입력 방식을 학습해야 하고, 자유 텍스트는 오탈자에 취약함
Potential impact: 검색 성공률 저하 (추론)
Recommended direction: recommendations의 지역 입력을 job-regions.ts의 시·도 select로 통일
Priority: P2
```

```text
Problem: 페이지네이션 부재, 화면마다 임의의 대량 조회(60/400/500건)
Location: frontend/lib/data.ts, frontend/app/companies/page.tsx
Why it matters: 데이터가 늘어나면(전국 확장 시) 응답 시간·외부 API 호출 횟수가 선형 이상으로 증가
Potential impact: 전국 확장 로드맵(README에 명시)과 직접 충돌
Recommended direction: 백엔드가 이미 지원하는 pageNo/numOfRows를 프론트 UI(페이지네이션 또는 무한 스크롤)로 노출
Priority: P2
```

```text
Problem: friendlinessScore 계산의 기준점(60점 시작 등)이 매직넘버로 하드코딩되고, 공개된 CompanyRatingMethodology(가중치 공식)와 별도의 규칙임
Location: backend/app/services/company_rating_service.py
Why it matters: "방법론 공개"가 서비스 차별점(README)인데, 실제로는 job 단위 env 점수 규칙과 회사 단위 종합 공식이 서로 다른 곳에 나뉘어 있어 전체 그림을 추적하기 어려움
Potential impact: 방법론 페이지(/companies/rating-methodology)의 신뢰도와 실제 계산의 정합성 검증이 어려움
Recommended direction: env 6축 점수 규칙도 방법론 메타데이터의 일부로 노출하거나 문서화
Priority: P2
```

### Low

```text
Problem: 모달(로그인 모달 등)에 초기 포커스 이동/포커스 트랩이 없음
Location: frontend/app/community/CommunityClient.tsx
Why it matters: 키보드/스크린리더 사용자가 모달이 열려도 포커스가 배경 요소에 남아있을 수 있음
Potential impact: 접근성 저하 (WCAG 2.4.3 관련)
Recommended direction: 모달 오픈 시 첫 포커서블 요소로 포커스 이동, Tab 순환 제한
Priority: P3
```

```text
Problem: 헤더 아이콘 버튼이 이모지 글리프(♥, 🔍)를 아이콘 대용으로 사용
Location: frontend/components/SiteHeaderClient.tsx
Why it matters: 다른 컴포넌트들은 lucide-react 아이콘을 사용하는데 헤더만 이모지라 시각적 일관성이 떨어지고 OS별 렌더링 차이가 있음
Potential impact: 낮음 (aria-label은 이미 있어 접근성 자체보다는 시각 일관성 문제)
Recommended direction: lucide-react 아이콘으로 교체
Priority: P3
```

---

## 10. Improvement Candidates

| 후보 | 현재 문제 | 개발 난이도 | 사용자 가치 | FE 역량 어필 가치 | 우선순위 |
|---|---|---|---|---|---|
| 1. 데이터 계층 리팩터링 (fetch 전략 패턴화 + 단위테스트) | `lib/data.ts` 캐스케이드 복잡도, 테스트 부재 | 중 | 중(간접, 안정성) | 높음(설계력·테스트 증명) | P0 |
| 2. 안정적 Job ID 체계 | 배열 인덱스 ID로 인한 데이터 무결성 문제 | 중 (외부 API에 안정 식별자 있는지 확인 선행 필요) | 높음(찜 기능 신뢰도) | 중 | P0 |
| 3. 점수 계산 로직 단일화 (백엔드로 통합) | FE/BE 이중 구현 | 낮음~중 | 중(간접) | 중 | P1 |
| 4. 검색/필터 UX 통일 (지역 입력 방식) | recommendations vs jobs/regions 불일치 | 낮음 | 높음(핵심 여정) | 중 | P1 |
| 5. 접근성 보강 (모달 focus trap, 터치 타깃, reduced-motion, aria-live) | 부분적으로만 구현됨 | 낮음~중 | 매우 높음(주 사용자 특성상) | 매우 높음(도메인과 직결되는 차별화 포인트) | P1 |
| 6. 페이지네이션/무한스크롤 도입 | 임의 대량 조회 | 중 | 중 | 중 | P2 |
| 7. 에러/로딩/빈 상태 UI 정비 + "실데이터 아님" 안내 | 조용한 mock 폴백 | 낮음 | 높음(신뢰성) | 중 | P1 |
| 8. 커뮤니티 기능 존폐 결정 및 (유지 시) 최소 백엔드 연동 | 완전 목업, 도메인과 단절 | 유지: 낮음 / 실연동: 높음 | 결정 필요 | 결정에 따라 상이 | 결정 우선 |
| 9. 자동화 테스트 도입 (프론트 단위테스트 + 백엔드 확장) | 안전망 부재 | 중 | 낮음(직접 체감 안 됨) | 높음(엔지니어링 성숙도 증명) | P1 |

과도한 설계 경계(섹션 11 반영): 위 후보 중 상태관리 라이브러리 도입, 마이크로프론트엔드화, 디자인 시스템 패키지 분리 등은 **현재 규모에서 불필요**하다고 판단해 후보에서 제외했습니다.

---

## 11. Do Not Over-engineer

다음은 "고치면 좋아 보이지만 지금 단계에서는 굳이 손댈 필요가 없다"고 판단한 항목입니다.

1. **반드시 수정**: Job ID 체계(무결성 문제), FE/BE 점수 로직 중복(신뢰도 문제), API 실패의 무음 처리(사용자 기만 소지).
2. **개선하면 좋음**: 지역 UX 통일, 페이지네이션, 접근성 보강 항목들, 테스트 도입.
3. **지금은 굳이 필요 없음**: 전역 상태관리 라이브러리 도입(현재 상태 규모가 작아 `useState`+`localStorage`로 충분), 백엔드 인메모리 캐시를 Redis 등으로 교체(트래픽 규모상 과설계), 디자인 시스템/컴포넌트 라이브러리 자체 구축.
4. **단순 취향 차이**: Tailwind 클래스 인라인 방식 vs CSS Module/styled-components — 현재 방식 유지가 합리적.
5. **사용자 가치가 낮은 기술적 개선**: `SiteHeaderClient`의 이모지 아이콘 교체(P3, 시각 일관성 문제일 뿐 기능 문제 아님), 커뮤니티 게시판 카테고리 목록을 데이터 주도로 바꾸는 것(현재 규모에서는 하드코딩이 오히려 단순함).

포트폴리오를 위한 과도한 아키텍처 도입 경계: 이 프로젝트의 실제 차별점은 "공공데이터 정규화 + 접근성 중심 UX"이지 "얼마나 복잡한 프론트 아키텍처를 썼는가"가 아닙니다. 따라서 상태관리/모노레포 툴링/마이크로 프론트엔드 같은 기술을 실제 필요 없이 추가하는 것은 지양해야 합니다.

---

## 12. Recommended Priority

- **P0** — Job ID 안정화, 데이터 계층(`lib/data.ts`) 리팩터링 착수(테스트 포함), API 키 복구·재검증(코드 밖 작업)
- **P1** — 점수 계산 로직 백엔드 단일화, API 실패/로딩/빈 상태 UX 정비, 접근성 보강(모달 focus trap·aria-live·터치 타깃), 커뮤니티 기능 존폐 결정, 데이터 계층 단위 테스트
- **P2** — 지역 검색 UX 통일, 페이지네이션 도입, 방법론 문서화 정합성 개선

---

## 13. ChoiceWork v2 Development Thesis

> **기존 ChoiceWork는 "실데이터 파이프라인은 검증되었으나, 그 위에 얹힌 프론트 데이터 계층과 신뢰성 장치(안정적 ID, 단일 진실 공급원 스코어링, 실패 상태의 정직한 노출, 접근성 디테일)가 MVP 마감 압박 속에서 임시방편으로 남아있는 시스템"이라는 문제의식으로 재설계한다.**
>
> v2는 새로운 기능을 추가하는 프로젝트가 아니라, **①검증된 공공데이터 연동을 그대로 유지하면서 ②데이터 계층을 예측 가능하고 테스트 가능하게 재구성하고 ③서비스가 스스로 "이것은 실데이터인가 추정치인가"를 사용자에게 정직하게 알리며 ④장애인 구직자라는 주 사용자에게 실제로 의미 있는 접근성 디테일을 완성하는** 프로젝트로 정의한다. 커뮤니티처럼 핵심 가치와 무관한 목업 기능은 유지·확장 여부를 먼저 결정하고, 상태관리 라이브러리나 마이크로 아키텍처 같은 "포트폴리오를 위한 기술 도입"은 실제 문제와 연결되지 않는 한 배제한다.

---

## 부록: 확인했으나 이번 감사 범위를 벗어나는 항목

- **사실**: 로컬 환경에서 `frontend/node_modules/.bin/next`가 `C:\first_repository\...` 경로를 참조하고 있어(`frontend_stderr.log`) 현재 디렉터리(`C:\choicework`)에서 바로 `npm run dev`가 실패합니다. 이는 코드 문제가 아니라 로컬 `node_modules` 재설치(`npm install`)로 해결되는 환경 이슈이며, 이번 코드 감사의 결론에는 영향을 주지 않습니다.
