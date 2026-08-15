# ChoiceWork v2 — Development Thesis

> `.claude/setting.md` 1단계 감사([docs/v2-audit-report.md](./v2-audit-report.md))를 바탕으로 작성한 2단계 문서입니다. 이 문서는 "왜 다시 만드는가"에서 "무엇을 어떻게 만들 것인가"까지를 연결합니다.

---

## 01. Why Revisit?

ChoiceWork는 이미 실패한 프로젝트가 아닙니다. `docs/planning.md` 개발일지가 보여주듯, 14일 MVP 기간 안에 8개 공공데이터 API를 실데이터로 연결하고 "탐색 → 확인 → 행동"이라는 사용자 여정을 완주 가능한 수준까지 완성했습니다. 이번 재작업(v2)의 동기는 "MVP가 부족해서"가 아니라, **마감이라는 제약 속에서 의도적으로 미뤄둔 것들이 남긴 흔적을 이제는 제대로 다룰 차례**라는 것입니다.

1단계 감사에서 확인한 흔적은 대체로 같은 패턴을 공유합니다 — *"일단 화면에 데이터가 보이게 만드는 것"*은 충분히 잘 해냈지만, *"그 데이터가 무엇이고, 어디서 왔고, 신뢰할 수 있는지"*를 시스템 스스로 알고 있게 만드는 일은 다음으로 미뤄졌습니다. Job ID가 배열 인덱스인 것, 점수 계산 로직이 두 언어에 따로 존재하는 것, API가 실패해도 사용자가 그 사실을 모르는 것 — 이 셋은 서로 다른 파일에 있지만 근본적으로 같은 질문에 대한 답이 없다는 공통점을 갖습니다: **"이 데이터의 identity와 source of truth는 무엇인가?"**

v2는 이 질문에 답하는 작업입니다. 기능을 더 넓히는 것이 아니라, 이미 만든 기능이 서 있는 땅을 단단하게 다지는 작업입니다.

---

## 02. What I Found

1단계 감사(`docs/v2-audit-report.md`)에서 코드로 확인한 핵심 발견들입니다.

### Unstable ID
- **위치**: `frontend/lib/api.ts`(`mapLiveJobToJob`), `frontend/lib/data.ts`(`getJobById`)
- **사실**: 구인 공고 ID가 API 응답 배열의 인덱스(`String(index)`)입니다. 외부 API 응답 순서가 바뀌면 같은 ID가 다른 공고를 가리킵니다.
- **왜 중요한가**: `BookmarkButton`/`saved-jobs`가 이 ID를 storageKey로 그대로 사용합니다. 사용자가 "저장한 공고"가 조용히 다른 공고로 바뀔 수 있는, 신뢰를 직접 훼손하는 결함입니다.

### Duplicated Scoring Logic
- **위치**: `backend/app/services/company_rating_service.py`(`compute_job_env_friendliness`) ↔ `frontend/lib/api.ts`(`computeAccessibilityScore`)
- **사실**: 근무환경 6축 점수 산정 규칙이 Python과 TypeScript에 사람이 직접 동일하게 옮겨 적혀 있습니다. 백엔드 코드 주석이 "프론트 computeAccessibilityScore와 동일한 룰"이라고 명시할 정도로 팀도 이 중복을 인지하고 있었습니다.
- **왜 중요한가**: 규칙이 한쪽만 바뀌면 서비스의 핵심 지표(친화도 점수)가 프론트와 백엔드에서 서로 다른 값을 낼 수 있습니다.

### Mock Community
- **위치**: `frontend/app/community/CommunityClient.tsx` (433줄)
- **사실**: 헤더 내비게이션에는 실제 기능처럼 노출되지만, 게시글·댓글·좋아요가 전부 `localStorage`에만 저장되고 백엔드·다른 사용자 개념이 없습니다.
- **왜 중요한가**: 서비스의 핵심 가치(공공데이터 기반 의사결정)와 방향이 다르고, 실제로 작동하는 기능처럼 보이지만 그렇지 않다는 점에서 포트폴리오 신뢰도에 위험 요소입니다.

### Silent Fallback
- **위치**: `frontend/lib/data.ts` 전역 (모든 `getXxx` 함수의 `try/catch`)
- **사실**: API 호출이 실패하면 에러를 사용자에게 알리지 않고 mock 데이터나 빈 배열로 조용히 대체합니다. 30초 쿨다운(`apiDisabledUntil`) 동안 재시도조차 하지 않습니다.
- **왜 중요한가**: 사용자는 지금 보고 있는 데이터가 실시간 공공데이터인지 목업인지 구분할 방법이 거의 없습니다. `docs/frontend-improvements.md`에도 팀이 이미 같은 문제를 기록해두었습니다.

### No Tests
- **위치**: `frontend/` 전체(0건), `backend/tests/test_api.py`(1개 파일, 98줄)
- **사실**: 위 네 가지 문제를 고치는 리팩터링을 검증할 자동화된 안전망이 사실상 없습니다.

### Inconsistent Region UX
- **위치**: `frontend/app/recommendations/page.tsx`(자유 텍스트 region input) vs `frontend/lib/job-regions.ts` + `frontend/app/jobs/regions/page.tsx`(시·도 → 시·군·구 단계 선택)
- **사실**: 같은 "지역"이라는 개념을 페이지마다 다른 입력 방식으로 다룹니다.

### Accessibility Gaps (부분적)
- **사실**: 포커스 스타일·키보드 핸들러·dialog 시맨틱 등 기본기는 상당 부분 갖춰져 있으나, 모달 focus trap, 터치 타깃 크기(36px, 권장 44px 미달), `prefers-reduced-motion` 대응, 검색 결과 변경의 `aria-live` 알림은 확인되지 않았습니다.

---

## 03. What I Learned

이 프로젝트를 처음 만들 때와 지금 다시 감사하는 지금 사이에, 코드를 보는 관점 자체가 바뀐 지점들입니다. 각 항목은 "What I Found"의 특정 발견과 직접 연결됩니다.

### Before / After — 데이터의 identity

**Before**
데이터를 받아와서 화면에 표시하는 것에 집중했다. API 응답 배열을 받으면 그걸 순서대로 렌더링하고, 상세 페이지로 이동할 임시 key만 있으면 충분하다고 생각했다.

**After**
데이터의 **identity**(이 레코드를 다른 모든 레코드와 구별하는 무엇)와 **source of truth**(이 값이 진짜로 어디서 오는가)가 서비스 안정성에 직접적인 영향을 준다는 것을 이해하게 되었다. `String(index)`를 ID로 쓰는 순간, 그 ID는 데이터가 아니라 "지금 이 순간의 응답 순서"에 불과했다. 사용자의 찜 목록처럼 시간이 지나도 유지되어야 하는 상태는, ID가 진짜 identity를 담고 있지 않으면 아무리 UI를 잘 만들어도 무너진다.

### Before / After — "일단 보여주기" vs "정직하게 실패하기"

**Before**
API가 실패했을 때 빈 화면보다는 뭔가(mock이라도)를 보여주는 것이 항상 더 나은 사용자 경험이라고 생각했다. `lib/data.ts`의 모든 폴백 로직은 이 가정 위에서 짜여졌다.

**After**
*무엇을 보여주는가*보다 *사용자가 그것이 무엇인지 알 수 있는가*가 더 중요하다는 것을 배웠다. 조용히 mock으로 대체하는 것은 단기적으로는 화면을 채우지만, 장기적으로는 "이 서비스가 지금 나에게 진짜 정보를 주고 있는가"에 대한 신뢰를 갉아먹는다. 특히 이 서비스처럼 사용자가 데이터를 근거로 의사결정을 내려야 하는 경우, 실패를 숨기는 것은 친절이 아니라 위험이다.

### Before / After — 도메인 로직이 사는 곳

**Before**
프론트엔드와 백엔드는 각자의 언어로, 각자 필요한 곳에서 필요한 로직을 짜면 된다고 생각했다. 점수 계산처럼 간단해 보이는 로직은 양쪽에 있어도 크게 문제 될 게 없다고 여겼다.

**After**
도메인 로직(이 프로젝트에서는 "친화도 점수 계산")은 **한 곳에만 존재해야 한다**는 것을, 그리고 그렇지 않으면 겉보기엔 하나의 기능이지만 실제로는 "같아 보이는 두 개의 다른 시스템"이 만들어진다는 것을 깨달았다. 백엔드 코드에 "프론트와 동일한 룰"이라는 주석을 남겨야 했던 그 순간이, 이미 설계가 잘못됐다는 신호였다.

### Before / After — 접근성을 설계에 넣는 시점

**Before**
접근성은 기능을 다 만든 뒤에 `aria-label` 몇 개, 포커스 스타일 몇 줄을 추가하면 되는 마무리 작업이라고 생각했다.

**After**
포커스 이동 순서, 모달의 초기 포커스, 키보드만으로 완결되는 상호작용 흐름 같은 것은 **컴포넌트를 처음 설계하는 단계에서부터 고려해야** 나중에 다시 뜯어고치지 않는다는 것을 배웠다. 그리고 ChoiceWork처럼 장애인 구직자를 주 사용자로 하는 서비스에서는, 접근성이 "지켜야 할 규칙"이 아니라 "핵심 기능 그 자체"라는 것도 이번 감사를 하면서 다시 확인했다.

### Before / After — 테스트와 리팩터링의 관계

**Before**
규모가 작은 프로젝트는 손으로 몇 번 확인하는 것으로 충분하고, 테스트 코드는 나중에 팀이 커지면 추가하면 된다고 생각했다.

**After**
테스트가 없는 상태에서의 리팩터링은 리팩터링이 아니라 도박이라는 것을 배웠다. 이번 감사에서 발견한 문제들(ID 체계 변경, 점수 로직 통합, 폴백 전략 재설계)은 전부 기존 동작을 깨뜨리기 매우 쉬운 변경들이다. 무엇을 고치기 전에, 고치기 전의 동작을 먼저 코드로 고정해두는 것이 순서라는 것을 이제는 안다.

---

## 04. Development Thesis

> **기존 ChoiceWork는 "실데이터 파이프라인은 검증되었으나, 그 위에 얹힌 프론트 데이터 계층과 신뢰성 장치(안정적 ID, 단일 진실 공급원 스코어링, 실패 상태의 정직한 노출, 접근성 디테일)가 MVP 마감 압박 속에서 임시방편으로 남아있는 시스템"이라는 문제의식으로 재설계한다.**
>
> v2는 새로운 기능을 추가하는 프로젝트가 아니라, **①검증된 공공데이터 연동을 그대로 유지하면서 ②데이터 계층을 예측 가능하고 테스트 가능하게 재구성하고 ③서비스가 스스로 "이것은 실데이터인가 추정치인가"를 사용자에게 정직하게 알리며 ④장애인 구직자라는 주 사용자에게 실제로 의미 있는 접근성 디테일을 완성하는** 프로젝트로 정의한다. 커뮤니티처럼 핵심 가치와 무관한 목업 기능은 유지·확장 여부를 먼저 결정하고, 상태관리 라이브러리나 마이크로 아키텍처 같은 "포트폴리오를 위한 기술 도입"은 실제 문제와 연결되지 않는 한 배제한다.

---

## 05. Improvement Priorities

### P0 — 안정성의 전제조건 (신뢰를 깨뜨리는 결함부터)
- [x] 안정적인 Job ID 체계 도입 (배열 인덱스 → 외부 API의 안정 식별자 또는 병합 키 기반 ID) — 2026-08-15 완료
- [x] `frontend/lib/data.ts` 데이터 계층 리팩터링 착수 — 폴백 전략을 반복되는 try/catch에서 선언적 구조로 추출 — 2026-08-15 완료
- [x] 데이터 계층 단위 테스트 확보 (리팩터링 전 현재 동작부터 고정) — 2026-08-15 완료 (프론트 25건 + 백엔드 2건)
- [ ] 백엔드 `.env` 복구 및 API 키 유효성 재검증 (코드 밖 운영 작업) — 미착수, `data.go.kr`/`data.gg.go.kr` 콘솔 접근 필요

### P1 — 신뢰도와 접근성 (사용자가 직접 체감하는 것)
- 친화도/근무환경 점수 계산 로직을 백엔드 단일 소스로 통합, 프론트는 API 응답값만 사용
- API 실패·로딩·빈 상태에 "지금 보고 있는 데이터가 실시간인지 추정치인지"를 정직하게 노출
- 접근성 보강: 모달 focus trap, 터치 타깃 44px 이상, `prefers-reduced-motion` 대응, 검색 결과 변경 `aria-live` 알림
- 커뮤니티 기능 존폐 결정 (유지한다면 최소 백엔드 연동, 아니라면 축소/제거)

### P2 — 확장을 위한 정리
- 지역 검색 UX 통일 (`/recommendations` 자유 텍스트 → `/jobs/regions`와 동일한 시·도 단계 선택)
- 페이지네이션/무한 스크롤 도입 (백엔드가 이미 지원하는 `pageNo`/`numOfRows`를 UI로 노출)
- 근무환경 6축 점수 규칙을 공개 방법론(`/companies/rating-methodology`) 문서에 통합

---

## 06. Architecture Direction

목표는 아키텍처를 새로 발명하는 것이 아니라, **이미 올바른 레이어링(백엔드가 외부 API를 감싸고, 프론트는 백엔드만 호출하는 구조)을 유지한 채, 지금 각 레이어 안에 뒤섞여 있는 관심사를 정리**하는 것입니다.

```text
[External Public APIs]  (변경 없음 — 이미 서버에서만 호출됨)
        ↓
[backend/app/services]  ← 여기로 "점수 계산"을 완전히 귀속
        │   - env 6축 점수 계산: 백엔드 단일 소스 (프론트 복제 제거)
        │   - 안정적 식별자 부여: merge_key 또는 외부 rno를 id로 응답에 포함
        ↓
[backend/app/routers]   응답에 "source: live | fallback" 메타를 항상 포함하도록 표준화
        ↓
[frontend/lib/api.ts]   순수 HTTP + 타입 매핑만 담당 (점수 계산 로직 제거)
        ↓
[frontend/lib/data.ts]  폴백 "전략"을 선언적으로 정의하는 계층으로 축소
        │   예: const strategy = [liveMerged, keadMerged, mock] 순회 + 각 단계 source 태깅
        ↓
[Server Component]      받은 데이터의 source를 UI 상태(배지/안내문구)로 그대로 전달
        ↓
[UI]                    "실시간 데이터" 또는 "추정 데이터"를 사용자에게 명시
```

핵심 방향 3가지:

1. **점수 계산의 단일 진실 공급원화**: `computeAccessibilityScore`(프론트)를 제거하고, 백엔드가 이미 응답에 포함하는 `friendlinessScore`/`ratingBreakdown`을 job 카드에도 그대로 사용하도록 통일합니다. 프론트는 표시만 담당합니다.
2. **폴백을 "숨기는 것"에서 "알리는 것"으로 전환**: `lib/data.ts`가 반환하는 모든 데이터에 `source: "live" | "fallback"` 메타를 동반시키고(이미 `/companies`는 유사한 패턴을 갖고 있음 — 이를 `/jobs`에도 일반화), UI가 이를 배지/안내문구로 노출합니다.
3. **ID·병합 키를 데이터 모델의 1급 시민으로 승격**: 현재 백엔드 `_merge_key`는 내부 병합에만 쓰이는데, 이를 응답 스키마의 정식 필드로 노출해 프론트가 인덱스 대신 이 값을 ID로 사용하도록 합니다.

새로운 상태관리 라이브러리, 별도 BFF 계층, 마이크로 프론트엔드 같은 구조 변경은 포함하지 않습니다 — 현재 문제는 아키텍처의 종류가 아니라 기존 레이어 안의 책임 분리 문제이기 때문입니다.

---

## 07. Implementation Plan

### Phase 1 — 기반 다지기 (P0)
1. `backend/.env` 복구, `DATA_GO_API_KEY` 등 키 유효성 확인 (코드 변경 없음, 운영 작업) — **미착수** (운영자 계정 필요)
2. `frontend/lib/data.ts`의 현재 동작을 고정하는 단위 테스트 작성 (리팩터링 전 스냅샷 역할) — **완료** (2026-08-15)
3. 백엔드 응답에 안정 식별자(병합 키 기반) 필드 추가 → 프론트 `Job.id`를 이 필드로 교체, `BookmarkButton`/`saved-jobs` 마이그레이션(기존 인덱스 기반 저장값 처리 방식 결정 포함) — **완료** (2026-08-15, 상세는 09장 참고)
4. `lib/data.ts` 폴백 로직을 전략 배열 구조로 리팩터링 (1의 테스트로 회귀 검증) — **완료** (2026-08-15)

### Phase 2 — 신뢰도 계층 (P1 일부)
5. `frontend/lib/api.ts`의 `computeAccessibilityScore` 제거, job 카드가 백엔드 응답값을 직접 사용하도록 변경
6. `/jobs` 계열 응답에 `source` 메타 추가(백엔드) → 프론트 UI에 실시간/추정 배지 노출(홈, 추천, 상세 페이지)
7. 커뮤니티 기능 존폐 결정 회의/판단 → (유지 결정 시) 최소 백엔드 저장소(게시글/댓글 테이블 또는 기존 백엔드에 붙일 수 있는 최소 API) 설계 착수

### Phase 3 — 접근성 & UX 일관성 (P1 나머지 + P2)
8. 모달 focus trap 유틸 추가 → 로그인 모달 등에 적용
9. 터치 타깃 36px → 44px 조정, `prefers-reduced-motion` 대응, 검색 결과 영역에 `aria-live="polite"` 추가
10. `/recommendations` 지역 입력을 `lib/job-regions.ts` 기반 시·도 select로 교체

### Phase 4 — 확장 준비 (P2 나머지)
11. `/companies`, `/recommendations`에 페이지네이션 UI 추가 (백엔드 `pageNo`/`numOfRows` 활용)
12. env 6축 점수 규칙을 `build_rating_methodology()` 응답에 통합해 방법론 문서와 실제 계산을 일치시킴

각 Phase는 이전 Phase의 테스트/검증을 전제로 순차 진행하며, Phase 1을 건너뛰고 Phase 2 이후를 먼저 시작하지 않습니다 — 안전망 없이 ID·점수 로직을 동시에 바꾸는 것이 가장 위험하다고 판단했기 때문입니다.

---

## 08. Validation Plan

| Phase | 검증 방법 | 통과 기준 |
|---|---|---|
| 1 — 데이터 계층 스냅샷 테스트 | `lib/data.ts` 각 함수(API 성공/실패/부분 실패 mock)에 대한 단위 테스트 | 리팩터링 전후 동일 입력에 동일 출력 |
| 1 — ID 안정화 | 동일 공고를 여러 번 재조회했을 때 ID가 동일한지 확인하는 테스트 + 기존 페이지 순서가 바뀌는 상황을 모킹한 회귀 테스트 | 페이지 응답 순서가 바뀌어도 동일 공고의 ID 불변 |
| 2 — 점수 단일화 | 백엔드 `compute_job_env_friendliness` 단위 테스트 확장 + 프론트에서 해당 함수가 더 이상 호출되지 않는지 코드 검색으로 확인 | 프론트 코드에 점수 계산 로직 0건, 화면에 표시되는 값이 API 응답값과 100% 일치 |
| 2 — Source 노출 | 의도적으로 백엔드를 끈 상태에서 프론트 화면 수동 확인 | "실시간 데이터 아님" 문구가 최소 홈/추천/기업 목록에 노출됨 |
| 3 — 접근성 | 키보드만으로 로그인 모달 열기→닫기→포커스 복귀 수동 테스트, 스크린리더(NVDA 등)로 검색 결과 변경 안내 확인 | 마우스 없이 핵심 플로우(검색→필터→상세→찜) 완주 가능 |
| 3 — 지역 UX | `/recommendations`와 `/jobs/regions`에서 동일 지역 선택 시 동일 결과 집합 반환 여부 수동 비교 | 두 진입점의 지역 필터 결과가 일치 |
| 4 — 페이지네이션 | 대량 데이터(400건 이상) 상황에서 초기 응답 시간 측정(수동, 실측치 기반) | 페이지네이션 도입 전 대비 초기 응답에 필요한 API 호출 수 감소 |
| 전체 | `docs/planning.md`의 기존 smoke test 방식(8개 엔드포인트 + 4개 페이지 PASS 확인)을 v2 API 셋 기준으로 재실행 | 전 엔드포인트/페이지 정상 응답 |

---

## 09. Progress Log

### 2026-08-15 — Phase 1 착수: 환경 정비 + 안정적 ID + 데이터 계층 리팩터링

#### 한 줄 요약
로컬 dev 환경 차단 이슈와 Next.js 보안 취약점을 먼저 정리하고, Phase 1의 핵심 과제였던 "Job ID 불안정성"을 백엔드·프론트 세 갈래 데이터 경로 전부에서 해결한 뒤, `lib/data.ts`의 폴백 캐스케이드를 테스트로 고정하고 선언적 구조로 리팩터링했다.

#### 0) 사전 정리 — 로컬 환경 차단 이슈
- **증상**: `frontend/node_modules/.bin/next`가 이전 경로(`C:\first_repository\...`)를 참조해 `npm run dev`가 즉시 실패(`'next'은(는) ... 실행할 수 있는 프로그램이 아닙니다`).
- **원인**: 저장소가 다른 경로(`C:\choicework`)로 옮겨진 뒤 `node_modules`를 재설치하지 않은 상태.
- **조치**: `npm i`로 재설치(사용자가 직접 실행) 후, `npm audit`에서 Next.js 자체의 high severity 취약점 6건(SSRF, 캐시 포이즈닝, 미들웨어 우회, 내부 엔드포인트 노출 등)을 발견해 `npm audit fix`로 `next 16.2.4 → 16.3.1`(기존 `package.json` semver 범위 내, breaking change 없음)로 패치. 최종 `0 vulnerabilities`.

#### 1) Unstable ID 해결
**변경 파일**: `backend/app/services/live_job_service.py`, `backend/app/schemas/live_job.py`, `frontend/lib/api.ts`, `frontend/lib/kead-jobs.ts`, `frontend/lib/data.ts`

- 백엔드에 `_stable_id()` 추가 — 기존에 raw/env 공고 병합에만 쓰던 `_merge_key`(기업명·직무명·마감일·연락처·등록일·주소 6개 필드)를 SHA-1 해시한 16자 문자열. `/jobs/live`, `/jobs/live-with-env`, `/jobs/live-merged` 세 엔드포인트 모두에 `id` 필드로 노출.
- **감사 단계에서 놓쳤던 추가 발견**: `frontend/lib/kead-jobs.ts`가 백엔드를 거치지 않고 공공데이터 API를 직접 호출하는 세 번째 병렬 구현이었고, 여기도 `id: String(index)` 문제가 동일하게 있었다. `node:crypto`로 백엔드와 동일한 해시 알고리즘(`stableJobId`)을 구현해 반영 — 이제 세 데이터 경로(백엔드 merge, KEAD 직접 호출, live-with-env) 어디를 거치든 같은 공고는 같은 id를 가진다.
- `frontend/lib/api.ts`의 `mapLiveJobToJob`은 `item.id`를 우선 사용하고, 구버전 백엔드 대비용으로만 인덱스를 최후 폴백으로 남겼다.
- `frontend/lib/data.ts`의 `getJobById`를 "인덱스로 페이지/오프셋 계산" 방식에서 "충분히 큰 배치(500건, 기존 `companies` 쪽 job-pool 매칭과 동일 규모)를 받아 id로 찾는" 방식으로 재작성.
- `BookmarkButton`/`saved-jobs`/`JobCard`/`/job/[id]`는 `job.id`를 처음부터 불투명한 문자열로만 다루고 있어 **별도 마이그레이션 코드 없이 자동으로 안정화**된다. 다만 이번 배포 전에 저장된 찜 목록은 옛 인덱스 id 기준이라 이후 매치되지 않는다 — 실사용자가 없는 현재 단계에서는 감수 가능한 일회성 트레이드오프로 판단.

#### 2) 데이터 계층 단위 테스트 확보
**신규 파일**: `frontend/vitest.config.mts`, `frontend/lib/__tests__/data.test.ts`, `frontend/lib/__tests__/kead-jobs.test.ts`

- `vitest` devDependency로 추가(`npm i -D vitest`, 설치 후에도 0 vulnerabilities 유지).
- `lib/data.ts`의 모든 공개 함수(`getJobs`, `getJobById`, `getRatingMethodology`, `getCompaniesWithMeta`, `getLiveJobsComparison`, `getLiveJobsTotal`)에 대해 "API 성공 / API 실패·다음 소스로 폴백 / 모든 소스 실패 + mock 허용·금지" 경로를 각각 검증하는 테스트 25건 작성. `vi.mock`으로 `./api`, `./kead-jobs`를 대체하고, `vi.resetModules()` + 동적 `import()`로 `NEXT_PUBLIC_API_URL` 등 모듈 로드 시점 환경변수 조합별 시나리오를 재현.
- `stableJobId`(프론트)에 대한 단위 테스트 3건, 백엔드 `_stable_id`/`_normalize_item`에 대한 단위 테스트 2건 추가.
- **이 테스트들이 먼저 갖춰진 뒤에 3)의 리팩터링을 진행** — "What I Learned"(03장)에서 다짐한 "테스트 없는 리팩터링은 도박"을 실제로 지킨 지점.

#### 3) `lib/data.ts` 폴백 로직의 선언적 구조 리팩터링
- 반복되던 `if (!shouldUseApi()) return X; try { ... } catch (e) { disableApiTemporarily(e); return Y; }` 패턴을 `attempt<T>(guard, source)` 헬퍼 하나로 추출. 소스를 시도할지 여부(guard)와 실패 시 쿨다운 처리를 한 곳에 모으고, 각 함수는 "다음에 뭘 시도할지"만 남도록 정리.
- `getJobById`/`getJobs`에서 반복되던 "id로 찾기" 로직은 `findById<T extends { id: string }>()` 공통 헬퍼로 추출.
- 리팩터링 전후로 함수 동작이 1:1 동일함을 2)의 테스트 25건이 계속 통과하는 것으로 확인(리팩터링 도중 회귀 0건).

#### 검증
- 백엔드: `pytest tests/test_api.py` 11/11 통과
- 프론트: `vitest run` 25/25 통과, `tsc --noEmit` 클린, `next build` 프로덕션 빌드 성공(23개 라우트)
- 발견했지만 이번 범위에서 다루지 않은 것: `next lint`가 Next 16 환경에서 실행 자체가 깨져 있음(`Invalid project directory provided`) — ESLint 9 flat config 미전환과 관련된 것으로 보이는 기존 툴링 이슈. 이번 변경으로 생긴 문제는 아니며 별도 항목으로 남겨둠.

#### 남은 Phase 1 항목
- 백엔드 `.env` 복구 및 API 키 재검증 (운영 작업, 코드 밖) — 여전히 미착수
- `next lint` 실행 불가 이슈 — 새로 발견, 우선순위 미정(다음 라운드에서 P2 후보로 검토)

---

이 문서(`thesis_dev.md`)와 감사 보고서(`v2-audit-report.md`)를 기준으로 Phase 1 핵심 작업을 진행했으며, 남은 항목(`.env` 복구, `next lint` 정비)과 Phase 2(점수 계산 단일화, source 노출) 착수 여부는 다음 단계에서 논의합니다.
