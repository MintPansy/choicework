from __future__ import annotations

import hashlib
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from xml.etree import ElementTree

import requests
from fastapi import HTTPException

from app.core.config import settings
from app.services.company_rating_service import compute_job_env_friendliness

# 짧은 TTL로 동일 파라미터 반복 호출(목록·인사이트 등) 시 외부 API 부하 감소
_MERGED_CACHE: dict[tuple[int, int], tuple[float, dict[str, Any]]] = {}
_MERGED_TTL_SEC = 60.0
_COMPARISON_CACHE: dict[tuple[int, int], tuple[float, dict[str, Any]]] = {}
_COMPARISON_TTL_SEC = 30.0


def _merge_key(item: dict[str, str]) -> str:
    """raw/env 공고를 동일 건으로 묶는 키. 응답 순서(index)에 의존하지 않는 값만 사용."""
    return "|".join(
        [
            item.get("businessName", ""),
            item.get("jobName", ""),
            item.get("applicationDate", ""),
            item.get("contactNumber", ""),
            item.get("registeredAt", ""),
            item.get("companyAddress", ""),
        ]
    )


def _stable_id(item: dict[str, str]) -> str:
    """공고 내용 기반 안정 식별자. 페이지 응답 순서가 바뀌어도 동일 공고는 동일 id를 가짐."""
    return hashlib.sha1(_merge_key(item).encode("utf-8")).hexdigest()[:16]


def _text(item: ElementTree.Element, tag: str) -> str:
    node = item.find(tag)
    if node is not None and node.text:
        return node.text.strip()
    return ""


def _int_from_xml(root: ElementTree.Element, path: str, fallback: int) -> int:
    value = root.findtext(path)
    if not value:
        return fallback
    try:
        return int(value)
    except ValueError:
        return fallback


def _request_job_api(path: str, page_no: int, num_of_rows: int) -> ElementTree.Element:
    api_key = settings.data_go_api_key or settings.odcloud_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="DATA_GO_API_KEY, B552583_API_KEY, ODCLOUD_API_KEY 중 하나가 필요합니다.",
        )

    url = f"{settings.data_go_job_base_url}{path}"
    params = {"serviceKey": api_key, "pageNo": str(page_no), "numOfRows": str(num_of_rows)}
    try:
        response = requests.get(url, params=params, timeout=20)
        response.raise_for_status()
        root = ElementTree.fromstring(response.content)
    except requests.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"구인 API HTTP 오류: {exc}") from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"구인 API 요청 실패: {exc}") from exc
    except ElementTree.ParseError as exc:
        raise HTTPException(status_code=502, detail="구인 API XML 파싱 실패") from exc

    result_code = root.findtext(".//resultCode")
    if result_code and result_code not in ("00", "0000"):
        result_msg = root.findtext(".//resultMsg") or "외부 API 오류"
        raise HTTPException(status_code=502, detail=f"구인 API 오류({result_code}): {result_msg}")
    return root


def _request_job_api_json(path: str, page_no: int, num_of_rows: int) -> dict[str, Any]:
    api_key = settings.data_go_api_key or settings.odcloud_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="DATA_GO_API_KEY, B552583_API_KEY, ODCLOUD_API_KEY 중 하나가 필요합니다.",
        )

    url = f"{settings.data_go_job_base_url}{path}"
    params = {
        "serviceKey": api_key,
        "pageNo": str(page_no),
        "numOfRows": str(num_of_rows),
        "_type": "json",
    }
    try:
        response = requests.get(url, params=params, timeout=20)
        response.raise_for_status()
        payload = response.json()
    except requests.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"구인 API HTTP 오류: {exc}") from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"구인 API 요청 실패: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="구인 API JSON 파싱 실패") from exc

    response_payload = payload.get("response", {})
    header = response_payload.get("header", {})
    result_code = str(header.get("resultCode", ""))
    if result_code and result_code not in ("00", "0000"):
        result_msg = str(header.get("resultMsg", "외부 API 오류"))
        raise HTTPException(status_code=502, detail=f"구인 API 오류({result_code}): {result_msg}")

    return response_payload.get("body", {})


def fetch_live_jobs(page_no: int = 1, num_of_rows: int = 20) -> dict[str, Any]:
    root = _request_job_api("/job_list", page_no, num_of_rows)
    items = root.findall(".//item")
    data: list[dict[str, str]] = []
    for item in items:
        entry = {
            "recruitmentPeriod": _text(item, "termDate"),
            "businessName": _text(item, "busplaName"),
            "contactNumber": _text(item, "cntctNo"),
            "companyAddress": _text(item, "compAddr"),
            "employmentType": _text(item, "empType"),
            "entryType": _text(item, "enterType"),
            "jobName": _text(item, "jobNm"),
            "applicationDate": _text(item, "offerregDt"),
            "registeredAt": _text(item, "regDt"),
            "agencyName": _text(item, "regagnName"),
            "requiredCareer": _text(item, "reqCareer"),
            "requiredEducation": _text(item, "reqEduc"),
            "salaryType": _text(item, "salaryType"),
            "salary": _text(item, "salary"),
        }
        entry["id"] = _stable_id(entry)
        data.append(entry)
    return {
        "pageNo": _int_from_xml(root, ".//pageNo", page_no),
        "numOfRows": _int_from_xml(root, ".//numOfRows", num_of_rows),
        "totalCount": _int_from_xml(root, ".//totalCount", len(data)),
        "data": data,
        "source": "live",
    }


def fetch_live_jobs_with_env(page_no: int = 1, num_of_rows: int = 20) -> dict[str, Any]:
    root = _request_job_api("/job_list_env", page_no, num_of_rows)
    items = root.findall(".//item")
    data: list[dict[str, str]] = []
    for item in items:
        entry = {
            "recruitmentPeriod": _text(item, "termDate"),
            "businessName": _text(item, "busplaName"),
            "contactNumber": _text(item, "cntctNo"),
            "companyAddress": _text(item, "compAddr"),
            "employmentType": _text(item, "empType"),
            "entryType": _text(item, "enterType"),
            "jobName": _text(item, "jobNm"),
            "applicationDate": _text(item, "offerregDt"),
            "registeredAt": _text(item, "regDt"),
            "agencyName": _text(item, "regagnName"),
            "requiredCareer": _text(item, "reqCareer"),
            "requiredEducation": _text(item, "reqEduc"),
            "salaryType": _text(item, "salaryType"),
            "salary": _text(item, "salary"),
            "envBothHands": _text(item, "envBothHands"),
            "envEyesight": _text(item, "envEyesight"),
            "envHandwork": _text(item, "envHandwork"),
            "envLiftPower": _text(item, "envLiftPower"),
            "envLstnTalk": _text(item, "envLstnTalk"),
            "envStndWalk": _text(item, "envStndWalk"),
        }
        entry["id"] = _stable_id(entry)
        entry["friendlinessScore"] = compute_job_env_friendliness(entry)
        data.append(entry)
    return {
        "pageNo": _int_from_xml(root, ".//pageNo", page_no),
        "numOfRows": _int_from_xml(root, ".//numOfRows", num_of_rows),
        "totalCount": _int_from_xml(root, ".//totalCount", len(data)),
        "data": data,
        "source": "live",
    }


def _safe_items(body: dict[str, Any]) -> list[dict[str, Any]]:
    """data.go.kr JSON body에서 item 목록을 추출합니다.

    - 일반: ``body["items"]["item"]`` (list | dict)
    - 변형: ``body["items"]`` 가 곧바로 list인 경우
    - 변형: ``body["item"]`` 만 있는 경우
    """
    items = body.get("items")
    if isinstance(items, list):
        return [x for x in items if isinstance(x, dict)]
    if isinstance(items, dict):
        item = items.get("item", [])
        if isinstance(item, list):
            return [r for r in item if isinstance(r, dict)]
        if isinstance(item, dict):
            return [item]
        return []
    lone = body.get("item")
    if isinstance(lone, dict):
        return [lone]
    if isinstance(lone, list):
        return [x for x in lone if isinstance(x, dict)]
    return []


def _normalize_item(item: dict[str, Any], with_env: bool) -> dict[str, str]:
    base = {
        "recruitmentPeriod": str(item.get("termDate", "")).strip(),
        "businessName": str(item.get("busplaName", "")).strip(),
        "contactNumber": str(item.get("cntctNo", "")).strip(),
        "companyAddress": str(item.get("compAddr", "")).strip(),
        "employmentType": str(item.get("empType", "")).strip(),
        "entryType": str(item.get("enterType", "")).strip(),
        "jobName": str(item.get("jobNm", "")).strip(),
        "applicationDate": str(item.get("offerregDt", "")).strip(),
        "registeredAt": str(item.get("regDt", "")).strip(),
        "agencyName": str(item.get("regagnName", "")).strip(),
        "requiredCareer": str(item.get("reqCareer", "")).strip(),
        "requiredEducation": str(item.get("reqEduc", "")).strip(),
        "salaryType": str(item.get("salaryType", "")).strip(),
        "salary": str(item.get("salary", "")).strip(),
    }
    if with_env:
        base.update(
            {
                "envBothHands": str(item.get("envBothHands", "")).strip(),
                "envEyesight": str(item.get("envEyesight", "")).strip(),
                "envHandwork": str(item.get("envHandwork", "")).strip(),
                "envLiftPower": str(item.get("envLiftPower", "")).strip(),
                "envLstnTalk": str(item.get("envLstnTalk", "")).strip(),
                "envStndWalk": str(item.get("envStndWalk", "")).strip(),
            }
        )
        base["friendlinessScore"] = compute_job_env_friendliness(base)
    base["id"] = _stable_id(base)
    return base


def fetch_live_jobs_merged(page_no: int = 1, num_of_rows: int = 20) -> dict[str, Any]:
    cache_key = (page_no, num_of_rows)
    now = time.monotonic()
    hit = _MERGED_CACHE.get(cache_key)
    if hit and (now - hit[0]) < _MERGED_TTL_SEC:
        return hit[1]

    # 1회 호출 기준 최대 100건으로 끊어 멀티 페이지 조회
    page_size = 100
    target_count = max(1, num_of_rows)
    max_pages_by_target = max(1, (target_count + page_size - 1) // page_size)
    page_count = min(5, max_pages_by_target)

    raw_items: list[dict[str, str]] = []
    env_items: list[dict[str, str]] = []
    raw_total = 0
    env_total = 0
    collected_pages = 0

    for offset in range(page_count):
        current_page = page_no + offset
        with ThreadPoolExecutor(max_workers=2) as pool:
            raw_future = pool.submit(_request_job_api_json, "/job_list", current_page, page_size)
            env_future = pool.submit(_request_job_api_json, "/job_list_env", current_page, page_size)
            raw_body = raw_future.result()
            env_body = env_future.result()
        collected_pages += 1

        raw_total = max(raw_total, int(raw_body.get("totalCount", 0) or 0))
        env_total = max(env_total, int(env_body.get("totalCount", 0) or 0))

        raw_items.extend(_normalize_item(item, with_env=False) for item in _safe_items(raw_body))
        env_items.extend(_normalize_item(item, with_env=True) for item in _safe_items(env_body))

        if len(env_items) >= target_count:
            break

    raw_map = {_merge_key(item): item for item in raw_items}
    merged: list[dict[str, str]] = []
    matched_count = 0
    for env_item in env_items:
        key = _merge_key(env_item)
        if key in raw_map:
            matched_count += 1
        merged.append({**raw_map.get(key, {}), **env_item})
        if len(merged) >= target_count:
            break

    merge_rate = round((matched_count / len(merged)) * 100, 1) if merged else 0.0

    result: dict[str, Any] = {
        "pageNo": page_no,
        "numOfRows": target_count,
        "totalCount": env_total or raw_total or len(merged),
        "data": merged,
        "source": "live",
        "meta": {
            "requestedCount": target_count,
            "collectedPages": collected_pages,
            "rawCollectedCount": len(raw_items),
            "envCollectedCount": len(env_items),
            "mergedCount": len(merged),
            "mergeMatchRate": merge_rate,
            "rawTotalCount": raw_total,
            "envTotalCount": env_total,
        },
    }
    _MERGED_CACHE[cache_key] = (time.monotonic(), result)
    return result


def fetch_live_jobs_comparison(page_no: int = 1, num_of_rows: int = 1) -> dict[str, Any]:
    ck = (page_no, num_of_rows)
    now = time.monotonic()
    ch = _COMPARISON_CACHE.get(ck)
    if ch and (now - ch[0]) < _COMPARISON_TTL_SEC:
        return ch[1]

    with ThreadPoolExecutor(max_workers=2) as pool:
        raw_future = pool.submit(_request_job_api_json, "/job_list", page_no, num_of_rows)
        env_future = pool.submit(_request_job_api_json, "/job_list_env", page_no, num_of_rows)
        raw_body = raw_future.result()
        env_body = env_future.result()
    raw_total = int(raw_body.get("totalCount", 0) or 0)
    env_total = int(env_body.get("totalCount", 0) or 0)
    missing = max(0, raw_total - env_total)
    missing_rate = round((missing / raw_total) * 100, 1) if raw_total > 0 else 0.0
    out = {
        "jobListTotal": raw_total,
        "jobListEnvTotal": env_total,
        "missingEnvCount": missing,
        "missingEnvRate": missing_rate,
    }
    _COMPARISON_CACHE[ck] = (time.monotonic(), out)
    return out
