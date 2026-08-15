# ChoiceWork v2 — Initial Development Audit

## 1. Project Context

현재 작업 중인 프로젝트는 **ChoiceWork**라는 공공데이터 기반 장애인 맞춤형 일자리 탐색 서비스입니다.

이 프로젝트는 과거 2인 팀으로 진행했던 미니 프로젝트이며, 당시 MVP 수준으로 서비스를 구현하고 배포까지 완료했습니다.

현재 repository는 기존 팀 프로젝트를 Fork한 개인 repository이며, 앞으로 이 repository에서는 기존 ChoiceWork를 기반으로 **개인적인 FE 고도화 및 재개발**을 진행할 예정입니다.

중요한 점은 이번 작업을 단순히 새로운 기능을 추가하는 프로젝트로 접근하지 않는 것입니다.

기존 프로젝트를 하나의 **Legacy/MVP 시스템**으로 보고,

> 기존 구현을 전체적으로 분석 → 문제점과 기술 부채 발견 → 개선 우선순위 결정 → 개발 방향 수립 → 단계적 리팩터링 및 고도화

의 순서로 진행하고자 합니다.

---

# 2. Your Role

현재 단계에서 당신의 역할은 **Frontend Architect + Code Auditor + Development Advisor**입니다.

아직 코드를 수정하거나 기능을 추가하지 마세요.

먼저 현재 repository 전체를 충분히 탐색하고, 기존 시스템의 구조와 문제점을 분석해주세요.

이번 첫 단계의 목표는 **"무엇을 개발할 것인가?"를 결정하는 것**이지, 바로 개발하는 것이 아닙니다.

---

# 3. Analysis Scope

다음 영역을 가능한 한 구체적으로 분석해주세요.

## 3.1 Project Structure

* 전체 디렉터리 구조
* 주요 페이지 및 route
* 컴포넌트 구조
* utilities / hooks / lib 등의 역할
* 재사용 가능한 컴포넌트
* 지나치게 큰 컴포넌트
* 책임이 혼재된 파일
* 불필요하거나 중복된 코드
* 현재 구조에서 유지보수가 어려워질 가능성이 있는 부분

가능하면 다음과 같이 설명해주세요.

```text
Page
 ├─ Component
 │   ├─ Component
 │   └─ Component
 ├─ Hook
 └─ Data Layer
```

---

# 4. Data & API Architecture Audit

이번 분석에서 특히 중요하게 다뤄주세요.

현재 ChoiceWork가 어떤 데이터를 사용하고 있는지부터 확인해주세요.

### 확인할 것

* 공공데이터 API 사용 여부
* API endpoint
* API 호출 위치
* 인증 방식
* 환경변수 사용 여부
* API Key 관리 방식
* 요청 parameter
* response structure
* 데이터 fetching 방식
* 서버에서 호출하는지
* 클라이언트에서 직접 호출하는지
* 정적 JSON/CSV 등의 데이터를 사용하는지
* API response를 별도로 가공하는지
* UI에서 API response를 직접 사용하는지
* 데이터 모델과 UI 모델이 분리되어 있는지
* 중복 데이터 처리
* filtering / sorting / searching이 어디에서 이루어지는지
* pagination 방식
* caching 여부
* error handling
* loading state
* empty state

특히 다음 질문에 답해주세요.

> 현재 프로젝트의 데이터 흐름은 정확히 어떻게 구성되어 있는가?

예:

```text
Public Data API
      ↓
API Client
      ↓
Response
      ↓
Data Transformation
      ↓
Domain Model
      ↓
Search / Filter
      ↓
UI
```

실제 프로젝트가 위 구조와 다르다면 실제 구조를 기준으로 작성해주세요.

---

# 5. Public Data API Reusability

기존 프로젝트에서 사용했던 공공데이터 API가 현재도 유효하게 사용할 수 있는지 repository의 코드와 설정을 기준으로 판단해주세요.

다만 현재 단계에서는 실제 API를 무리하게 호출하거나 새로운 API Key를 발급받으려고 하지 마세요.

다음 사항을 구분해서 판단해주세요.

### A. 기존 API를 그대로 사용할 수 있는 경우

* 어떤 설정만 복구하면 되는지
* 필요한 환경변수
* 기존 API 구조의 문제점

### B. 기존 API Key가 만료되었거나 사용할 수 없는 경우

* 새 인증키가 필요한지
* 코드 구조상 API Key 교체만으로 해결 가능한지

### C. 기존 프로젝트가 실제 API가 아니라 정적 데이터/가공 데이터에 의존하는 경우

* 현재 데이터의 출처
* 데이터 갱신 방식
* 실시간성 문제
* 향후 API 기반 구조로 전환할 필요가 있는지

최종적으로

> **"ChoiceWork v2에서 공공데이터 API를 다시 연결해야 하는가?"**

에 대한 판단과 근거를 제시해주세요.

---

# 6. Frontend Architecture Audit

현재 Frontend 구조를 분석해주세요.

특히 다음을 확인해주세요.

* React / Next.js 구조
* App Router 사용 방식
* Server Component / Client Component 분리
* 상태 관리
* props drilling
* component coupling
* custom hooks
* API layer
* data layer
* domain logic
* UI logic
* 재사용성
* TypeScript 활용
* type safety
* any 사용 여부
* 에러 처리
* 폼 처리
* URL state 관리

다음 질문에도 답해주세요.

> 현재 구조가 프로젝트 규모가 커졌을 때 유지보수 가능한 구조인가?

---

# 7. UX / Accessibility Audit

ChoiceWork는 장애인 사용자를 주요 대상으로 하는 서비스이므로 일반적인 UX 분석과 함께 **웹 접근성 관점의 분석을 별도로 진행해주세요.**

확인 항목:

* semantic HTML
* keyboard navigation
* focus management
* focus visibility
* screen reader compatibility
* ARIA 사용
* heading hierarchy
* form accessibility
* button / link semantics
* color contrast
* text readability
* font scaling
* touch target size
* error message accessibility
* loading state accessibility
* empty state
* motion / animation
* mobile accessibility
* responsive design

가능하다면 WCAG 관점에서 잠재적인 문제를 분류해주세요.

---

# 8. Search & Job Discovery UX Audit

서비스의 핵심 기능인 일자리 탐색 경험을 집중적으로 분석해주세요.

사용자 흐름을 기준으로:

```text
홈
 ↓
검색 / 필터
 ↓
검색 결과
 ↓
공고 선택
 ↓
공고 상세
 ↓
지원 판단
```

각 단계에서 다음을 확인해주세요.

* 사용자가 무엇을 해야 하는지 명확한가?
* 원하는 일자리를 빠르게 찾을 수 있는가?
* 필터 구조가 적절한가?
* 필터가 너무 많거나 부족하지 않은가?
* 검색 상태가 유지되는가?
* URL로 검색 조건을 공유할 수 있는가?
* 정렬 방식이 적절한가?
* 결과가 없을 때 적절한 안내를 제공하는가?
* 모바일에서 탐색이 편리한가?

---

# 9. Performance Audit

현재 코드 기준으로 잠재적인 성능 문제를 찾아주세요.

예:

* unnecessary re-render
* excessive client components
* unnecessary API calls
* duplicate fetching
* large bundle
* image optimization
* inefficient list rendering
* missing pagination
* missing caching
* expensive filtering
* unnecessary state
* large static assets

단, 실제 성능 수치를 측정할 수 없는 경우에는 추측하지 말고

**"코드 구조상 잠재적인 문제"**

로 명확하게 구분해주세요.

---

# 10. Technical Debt

현재 프로젝트에서 발견되는 기술 부채를 정리해주세요.

다음과 같이 분류해주세요.

### Critical

서비스 안정성이나 핵심 기능에 영향을 줄 수 있는 문제

### High

유지보수성 / 확장성 / 사용자 경험에 큰 영향을 주는 문제

### Medium

현재는 동작하지만 향후 개선 가치가 높은 문제

### Low

코드 품질 또는 개발 편의성 측면의 개선 사항

각 항목에는 다음 정보를 포함해주세요.

```text
Problem
Location
Why it matters
Potential impact
Recommended direction
Priority
```

---

# 11. Do Not Over-engineer

이번 분석에서는 모든 문제를 무조건 해결 대상으로 판단하지 마세요.

특히 다음을 구분해주세요.

1. 반드시 수정해야 하는 문제
2. 개선하면 좋은 문제
3. 현재 프로젝트 규모에서는 굳이 수정할 필요가 없는 문제
4. 단순한 취향 차이
5. 실제 사용자 가치가 낮은 기술적 개선

**FE 포트폴리오를 위한 과도한 Architecture 적용이나 불필요한 기술 도입도 경계해주세요.**

---

# 12. Improvement Candidates

Audit 결과를 바탕으로 ChoiceWork v2에서 개선할 수 있는 후보를 정리해주세요.

예:

```text
1. Data Architecture Refactoring
2. API Layer Refactoring
3. Search / Filter UX
4. Accessibility Improvement
5. Component Architecture
6. State Management
7. Performance Optimization
8. Error / Loading / Empty State
9. Responsive UX
```

각 후보에 대해:

* 현재 문제
* 예상 개발 난이도
* 사용자 가치
* FE 역량 어필 가치
* 구현 우선순위

를 평가해주세요.

---

# 13. Portfolio Perspective

이번 프로젝트는 단순한 기능 추가 프로젝트가 아니라 **FE Master Portfolio의 프로젝트 중 하나로 활용할 예정**입니다.

따라서 단순히 "기능이 많아지는 것"보다 다음과 같은 역량을 보여줄 수 있는 개선을 우선적으로 평가해주세요.

* 기존 코드 분석
* Frontend architecture
* data handling
* TypeScript
* API integration
* accessibility
* responsive UI
* performance
* reusable components
* state management
* error handling
* testing
* maintainability

단, 포트폴리오에 보여주기 위한 기술을 억지로 추가하지 말고 **실제 문제와 연결되는 경우에만 제안해주세요.**

---

# 14. Final Deliverable

이번 단계에서는 코드를 수정하지 않고 다음 형태의 **Audit Report**를 작성해주세요.

## 1. Executive Summary

현재 ChoiceWork의 전체적인 상태를 5~10문장으로 요약

## 2. Current Architecture

현재 시스템 구조

## 3. Data / API Architecture

현재 데이터 흐름과 문제점

## 4. Frontend Architecture

현재 FE 구조와 문제점

## 5. UX / Accessibility

사용자 경험 및 접근성 문제

## 6. Performance

성능 관련 잠재 문제

## 7. Technical Debt

우선순위별 기술 부채

## 8. Improvement Candidates

개선 후보

## 9. Recommended Priority

P0 / P1 / P2 형태로 우선순위 제안

## 10. ChoiceWork v2 Development Thesis

최종적으로

> **"기존 ChoiceWork를 어떤 문제의식으로 어떻게 재설계할 것인가?"**

에 대한 하나의 명확한 Development Thesis를 제안해주세요.

---

# 15. Important Constraints

이번 첫 단계에서는:

* 코드를 수정하지 마세요.
* 파일을 삭제하지 마세요.
* 패키지를 설치하지 마세요.
* API Key를 새로 생성하지 마세요.
* 기존 데이터를 임의로 변경하지 마세요.
* 기능을 새로 구현하지 마세요.
* 근거 없이 문제를 추측하지 마세요.
* 실제 코드에서 확인한 사실과 추론을 구분해주세요.

**먼저 시스템을 이해하고, 문제를 발견하고, 개선 방향을 제안하는 것까지가 이번 작업의 목표입니다.**

분석 결과를 바탕으로 다음 단계에서 `thesis_dev.md`를 작성하고 실제 개발 계획을 수립하겠습니다.
