from fastapi.testclient import TestClient

from app.main import app
from app.services.accessibility_service import _rows_from_gg_json_payload

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_companies_returns_payload():
    res = client.get("/companies")
    assert res.status_code == 200
    payload = res.json()
    assert isinstance(payload, dict)
    assert payload.get("source") in ("live", "static")
    assert "data" in payload
    data = payload["data"]
    assert isinstance(data, list)
    assert len(data) > 0
    assert "companyName" in data[0]
    assert "friendlinessScore" in data[0]


def test_rating_methodology():
    res = client.get("/companies/rating-methodology")
    assert res.status_code == 200
    body = res.json()
    assert body.get("version")
    assert isinstance(body.get("weights"), list)
    assert len(body["weights"]) >= 6
    assert "workEnvDimensionsKo" in body


def test_normalize_company_name_key_strips_corp_markers():
    from app.services.company_name_normalize import normalize_company_name_key

    assert normalize_company_name_key("(주)삼성전자") == normalize_company_name_key("삼성전자")
    assert normalize_company_name_key("㈜네이버") == normalize_company_name_key("네이버")
    assert normalize_company_name_key("주식회사 현대") == normalize_company_name_key("현대")


def test_jobs_returns_list():
    res = client.get("/jobs")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "title" in data[0]
    assert "accessibilityTags" in data[0]


def test_gg_json_parser_object_root():
    """Ggsigundspsnactsport 형태: 루트가 서비스명 dict."""
    sample = {
        "Ggsigundspsnactsport": [
            {"head": [{"list_total_count": 2}]},
            {
                "row": [
                    {"SIGUN_NM": "가평군", "INST_NM": "기관A"},
                    {"SIGUN_NM": "고양시", "INST_NM": "기관B"},
                ]
            },
        ]
    }
    rows = _rows_from_gg_json_payload(sample)
    assert len(rows) == 2
    assert rows[0]["SIGUN_NM"] == "가평군"


def test_accessibility_institutions_rejects_unknown_sigun():
    res = client.get("/accessibility/institutions?sigunNm=서울특별시")
    assert res.status_code == 400


def test_accessibility_institutions_no_param_ok():
    res = client.get("/accessibility/institutions")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_stable_id_is_deterministic_and_content_based():
    from app.services.live_job_service import _stable_id

    item_a = {
        "businessName": "삼성전자",
        "jobName": "생산직",
        "applicationDate": "20260101",
        "contactNumber": "02-1234-5678",
        "registeredAt": "20251201",
        "companyAddress": "경기 수원시",
    }
    item_b = {**item_a, "jobName": "사무직"}

    assert _stable_id(item_a) == _stable_id(dict(item_a))
    assert _stable_id(item_a) != _stable_id(item_b)
    assert len(_stable_id(item_a)) == 16


def test_normalize_item_id_is_stable_across_raw_and_env_variants():
    """같은 공고의 raw/env 응답은 필드가 달라도(env 필드 유무) id가 같아야 병합이 올바르게 된다."""
    from app.services.live_job_service import _normalize_item

    raw_source = {
        "busplaName": "테스트기업",
        "jobNm": "테스트직무",
        "offerregDt": "20260101",
        "cntctNo": "02-0000-0000",
        "regDt": "20251230",
        "compAddr": "서울 강남구",
    }
    env_source = {**raw_source, "envEyesight": "일상적 활동 가능"}

    raw_item = _normalize_item(raw_source, with_env=False)
    env_item = _normalize_item(env_source, with_env=True)

    assert raw_item["id"]
    assert raw_item["id"] == env_item["id"]

    # 응답 순서가 바뀌어 index가 달라져도(=index를 아예 안 쓰므로) id는 내용에만 의존한다
    reordered_env_item = _normalize_item(dict(env_source), with_env=True)
    assert reordered_env_item["id"] == env_item["id"]


def test_gg_json_parser_legacy_list_root():
    """구형: [{서비스키: [ head 블록, row 블록 ]}]"""
    sample = [
        {
            "SomeService": [
                {"head": []},
                {"row": [{"SIGUN_NM": "수원시", "INST_NM": "C"}]},
            ]
        }
    ]
    rows = _rows_from_gg_json_payload(sample)
    assert len(rows) == 1
    assert rows[0]["SIGUN_NM"] == "수원시"
