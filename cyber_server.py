import os
import sys
import json
import re
import threading
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

# ─── Auto-sync state (shared, thread-safe via GIL for simple dict writes) ────
_auto_sync_state = {
    "last_run": None,          # ISO timestamp of last completed run
    "last_updated_count": 0,   # how many cars were updated last run
    "last_total_cars": 0,      # total cars scanned
    "last_status": "idle",     # 'idle' | 'running' | 'ok' | 'error'
    "last_error": None,        # error message if any
    "interval_minutes": 5,
    "next_run": None,          # ISO timestamp of next scheduled run
}
_auto_sync_lock = threading.Lock()

# ─── In-Memory API Response Cache (TTL 2 minutes) ────
_api_cache = {}
_api_cache_lock = threading.Lock()
_CACHE_TTL_SECONDS = 120

def get_from_cache(key: str, force: bool = False):
    if force:
        return None
    with _api_cache_lock:
        entry = _api_cache.get(key)
        if entry and (datetime.now(timezone.utc).timestamp() - entry["time"] < _CACHE_TTL_SECONDS):
            return entry["data"]
    return None

def set_to_cache(key: str, data):
    with _api_cache_lock:
        _api_cache[key] = {
            "time": datetime.now(timezone.utc).timestamp(),
            "data": data
        }

def invalidate_api_cache():
    with _api_cache_lock:
        if _api_cache:
            print(f"[CyberSync Cloud Cache] Cleared {len(_api_cache)} cache entries due to data mutation.")
            _api_cache.clear()


# Import business logic from scripts
from scripts.sync_thuan_an_allocations import (
    fetch_allocations_from_cyber,
    fetch_plan_map,
    fetch_physical_locations_from_cyber,
    sync_khoxe_locations_from_cyber,
    map_allocation_to_khoxe,
    upsert_to_supabase_khoxe,
    get_cyber_plan_filter_options,
    search_cyber_factory_plan,
    get_cyber_ton_kho_report,
    get_cyber_xep_xe_contracts,
    get_cyber_xep_xe_candidates,
    save_cyber_xep_xe,
    delete_cyber_xep_xe,
    create_cyber_dnx_ticket,
    get_cyber_voucher_tickets,
    lookup_vin_warehouse,
    check_cyber_contract_status,
    sync_cyber_car_status_to_supabase,
    upsert_cyber_car_status_records,
    export_cyber_pdf_via_ps,
    sync_all_cyber_to_supabase,
    sync_cyber_xep_xe_to_supabase,
    sync_cyber_ton_kho_to_supabase,
    sync_cyber_voucher_tickets_to_supabase
)
from scripts.cyber_crm_service import (
    get_crm_metadata,
    check_duplicates,
    import_bulk_khtn
)
from scripts.m_invoice_service import process_single_vin, auto_fetch_upload_and_notify

PORT = int(os.environ.get("PORT", 8080))

class CyberApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/cyber/view-pdf":
            try:
                qs = parse_qs(parsed.query)
                stt_rec = (qs.get("stt_rec", [""])[0] or "").strip()
                clean_stt = re.sub(r'\.pdf$', '', stt_rec, flags=re.IGNORECASE)
                base_stt = re.sub(r'(_sig|_nosig)$', '', clean_stt, flags=re.IGNORECASE)
                safe_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_stt)
                safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', clean_stt) + ".pdf"
                pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "cyber_pdfs")
                
                candidates = [
                    safe_name,
                    f"{safe_base}_nosig.pdf" if "_nosig" in clean_stt.lower() else f"{safe_base}_sig.pdf",
                    f"{safe_base}_sig.pdf",
                    f"{safe_base}_nosig.pdf",
                    f"{safe_base}.pdf"
                ]
                found_path = None
                for c in candidates:
                    p = os.path.join(pdf_dir, c)
                    if os.path.isfile(p):
                        found_path = p
                        break

                if found_path:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/pdf")
                    self.send_header("Content-Length", str(os.path.getsize(found_path)))
                    self._send_cors_headers()
                    self.end_headers()
                else:
                    self.send_response(404)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors_headers()
                    self.end_headers()
            except Exception:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
            return
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ["/", "/health", "/api/health"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            res = {
                "status": "ok",
                "service": "CyberSoft Allocation Cloud Sync API",
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/sync-status":
            # Return current auto-sync state for frontend badge
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            with _auto_sync_lock:
                payload = dict(_auto_sync_state)
            payload["server_time"] = datetime.now().isoformat()
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/plan-filter-options":
            try:
                qs = parse_qs(parsed.query)
                model = (qs.get("model", [""])[0] or "").strip()
                cache_key = f"plan_filter_options_{model}"
                cached = get_from_cache(cache_key)
                if cached:
                    res_data = cached
                else:
                    res_data = get_cyber_plan_filter_options(model=model)
                    if res_data and res_data.get("success"):
                        set_to_cache(cache_key, res_data)

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res_data, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Plan Filter Options Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e), "ttcp_list": [], "models": [], "versions": [], "colors": []}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/voucher-tickets":
            try:
                qs = parse_qs(parsed.query)
                ma_ct = (qs.get("ma_ct", [""])[0] or "").strip()
                ma_post = (qs.get("ma_post", [""])[0] or "").strip()
                search = (qs.get("search", [""])[0] or "").strip()
                from_date = (qs.get("fromDate", [""])[0] or "").strip()
                to_date = (qs.get("toDate", [""])[0] or "").strip()
                limit = (qs.get("limit", ["200"])[0] or "").strip()
                ma_ttcp = (qs.get("ma_ttcp", ["02.01.08"])[0] or "02.01.08").strip()

                tickets = get_cyber_voucher_tickets(
                    ma_ct=ma_ct,
                    ma_post=ma_post,
                    search=search,
                    from_date=from_date,
                    to_date=to_date,
                    limit=limit,
                    ma_ttcp=ma_ttcp
                )
                res = {"success": True, "data": tickets, "total": len(tickets)}
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/export-pdf":
            try:
                qs = parse_qs(parsed.query)
                stt_rec = (qs.get("stt_rec", [""])[0] or "").strip()
                voucher_type = (qs.get("voucher_type", ["TD4"])[0] or "TD4").strip()
                paper_size = (qs.get("paper_size", ["A4"])[0] or "A4").strip()
                user_name = (qs.get("user_name", ["02.NHANPT"])[0] or "02.NHANPT").strip()
                include_signatures = (qs.get("include_signatures", ["true"])[0] or "true").strip()

                result = export_cyber_pdf_via_ps(stt_rec, voucher_type, paper_size, user_name, include_signatures)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/diagnose-pdf":
            import shutil, ctypes.util
            data = {
                "os": sys.platform,
                "chrome": shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser"),
                "cairo": ctypes.util.find_library("cairo"),
                "pango": ctypes.util.find_library("pango"),
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        elif parsed.path == "/api/minvoice/fetch-invoice":
            try:
                qs = parse_qs(parsed.query)
                vin = (qs.get("vin", [""])[0] or "").strip()
                only_signed = (qs.get("only_signed", ["true"])[0] or "").lower() not in ("false", "0", "no")
                res = process_single_vin(vin, only_signed=only_signed)
                res_output = json.dumps(res, ensure_ascii=False)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(res_output.encode("utf-8"))
            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "status": "ERROR", "message": f"Lỗi xử lý M-Invoice: {str(e)}"}).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/view-pdf":
            try:
                qs = parse_qs(parsed.query)
                stt_rec = (qs.get("stt_rec", [""])[0] or "").strip()
                clean_stt = re.sub(r'\.pdf$', '', stt_rec, flags=re.IGNORECASE)
                base_stt = re.sub(r'(_sig|_nosig)$', '', clean_stt, flags=re.IGNORECASE)
                safe_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_stt)
                safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', clean_stt) + ".pdf"
                pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "cyber_pdfs")

                is_nosig = "_nosig" in clean_stt.lower()
                is_sig = "_sig" in clean_stt.lower()

                if is_nosig:
                    # Khi người dùng chọn không chèn chữ ký, TUYỆT ĐỐI không fallback sang file _sig.pdf
                    candidates = [
                        safe_name,
                        f"{safe_base}_nosig.pdf"
                    ]
                elif is_sig:
                    candidates = [
                        safe_name,
                        f"{safe_base}_sig.pdf",
                        f"{safe_base}.pdf"
                    ]
                else:
                    candidates = [
                        safe_name,
                        f"{safe_base}_sig.pdf",
                        f"{safe_base}_nosig.pdf",
                        f"{safe_base}.pdf"
                    ]

                found_path = None
                found_name = safe_name
                for c in candidates:
                    p = os.path.join(pdf_dir, c)
                    if os.path.isfile(p):
                        found_path = p
                        found_name = c
                        break

                if found_path:
                    with open(found_path, "rb") as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/pdf")
                    self.send_header("Content-Length", str(len(content)))
                    self.send_header("Content-Disposition", f'inline; filename="{found_name}"')
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(content)
                else:
                    self.send_response(404)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "PDF not found on server", "stt_rec": stt_rec}, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(404)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/check-contract-status":
            try:
                qs = parse_qs(parsed.query)
                p = {k: (v[0] if v else "") for k, v in qs.items()}
                result = check_cyber_contract_status(p)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/crm-metadata":
            try:
                qs = parse_qs(parsed.query)
                force = (qs.get("force", ["false"])[0] or "").lower() == "true"
                cached = get_from_cache("crm-metadata", force=force)
                if cached:
                    res = cached
                else:
                    res = get_crm_metadata()
                    if res.get("success"):
                        set_to_cache("crm-metadata", res)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/cyber/sync-allocations":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            from_date = data.get("fromDate")
            to_date = data.get("toDate")
            preview = data.get("preview", False)

            today_str = datetime.now().strftime("%Y-%m-%d")
            first_day_str = datetime.now().replace(day=1).strftime("%Y-%m-%d")

            from_date = from_date or first_day_str
            to_date = to_date or today_str

            print(f"[CyberSync Cloud] Request: from={from_date}, to={to_date}, preview={preview}")

            try:
                raw_cars = fetch_allocations_from_cyber(from_date, to_date)
                vins = [c.get("vin", "").strip().upper() for c in raw_cars if c.get("vin")]
                plan_map = fetch_plan_map(vins)
                cyber_locs = fetch_physical_locations_from_cyber(vins)
                mapped_cars = [map_allocation_to_khoxe(c, plan_map, cyber_locs) for c in raw_cars if c.get("vin")]

                if preview:
                    result = {
                        "success": True,
                        "mode": "preview",
                        "from_date": from_date,
                        "to_date": to_date,
                        "total": len(mapped_cars),
                        "cars": mapped_cars,
                        "vins": [c["vin"] for c in mapped_cars]
                    }
                else:
                    ok, fail = upsert_to_supabase_khoxe(mapped_cars)
                    result = {
                        "success": fail == 0,
                        "mode": "sync",
                        "from_date": from_date,
                        "to_date": to_date,
                        "total": len(mapped_cars),
                        "success_count": ok,
                        "fail_count": fail,
                        "cars": mapped_cars[:10],
                        "vins": [c["vin"] for c in mapped_cars]
                    }

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))

            except Exception as e:
                print(f"[CyberSync Cloud Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/sync-locations":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            preview = data.get("preview", False)
            target_vins = data.get("vins", None)

            print(f"[CyberSync Cloud Locations] Request: preview={preview}, target_vins_count={len(target_vins) if target_vins else 'ALL'}")

            try:
                result = sync_khoxe_locations_from_cyber(target_vins=target_vins, preview=preview)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Locations Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/sync-car-status":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            target_vins = data.get("vins", None)
            print(f"[CyberSync Car Status] Request: target_vins_count={len(target_vins) if target_vins else 'ALL'}")

            try:
                result = sync_cyber_car_status_to_supabase(target_vins=target_vins)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Car Status Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/plan-filter-options":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}
            model = (data.get("model") or "").strip()
            cache_key = f"plan_filter_options_{model}"
            cached = get_from_cache(cache_key)
            if cached:
                res_data = cached
            else:
                res_data = get_cyber_plan_filter_options(model=model)
                if res_data and res_data.get("success"):
                    set_to_cache(cache_key, res_data)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(res_data, default=str, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/search-factory-plan":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            is_force = bool(data.get("force") or data.get("refresh"))
            cache_key = f"search-factory-plan:{body_str}"
            cached_result = get_from_cache(cache_key, force=is_force)
            if cached_result is not None:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("X-Cache", "HIT")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(cached_result, default=str, ensure_ascii=False).encode("utf-8"))
                return

            print(f"[CyberSync Cloud Search] Request: {data}")
            try:
                result = search_cyber_factory_plan(data)
                if result and result.get("success") is not False:
                    set_to_cache(cache_key, result)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Search Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/ton-kho-report":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            is_force = bool(data.get("force") or data.get("refresh"))
            cache_key = f"ton-kho-report:{body_str}"
            cached_result = get_from_cache(cache_key, force=is_force)
            if cached_result is not None:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("X-Cache", "HIT")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(cached_result, default=str, ensure_ascii=False).encode("utf-8"))
                return

            print(f"[CyberSync Cloud Ton Kho Report] Request: {data}")
            try:
                result = get_cyber_ton_kho_report(data)
                if result and result.get("success") is not False:
                    set_to_cache(cache_key, result)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Ton Kho Report Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/xep-xe-contracts":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            is_force = bool(data.get("force") or data.get("refresh"))
            cache_key = f"xep-xe-contracts:{body_str}"
            cached_result = get_from_cache(cache_key, force=is_force)
            if cached_result is not None:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("X-Cache", "HIT")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(cached_result, default=str, ensure_ascii=False).encode("utf-8"))
                return

            print(f"[CyberSync Cloud Xep Xe Contracts] Request: {data}")
            try:
                result = get_cyber_xep_xe_contracts(data)
                if result and result.get("success") is not False:
                    set_to_cache(cache_key, result)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Xep Xe Contracts Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/xep-xe-candidates":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Xep Xe Candidates] Request: {data}")
            try:
                result = get_cyber_xep_xe_candidates(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Xep Xe Candidates Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/xep-xe-save":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Xep Xe Save] Request: {data}")
            try:
                result = save_cyber_xep_xe(data)
                if result and result.get("success") is not False:
                    invalidate_api_cache()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Xep Xe Save Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/xep-xe-delete":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Xep Xe Delete] Request: {data}")
            try:
                result = delete_cyber_xep_xe(data)
                if result and result.get("success") is not False:
                    invalidate_api_cache()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Xep Xe Delete Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/create-dnx":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Create DNX] Request: {data}")
            try:
                result = create_cyber_dnx_ticket(data)
                if result and result.get("success") is not False:
                    invalidate_api_cache()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Create DNX Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return
        elif parsed.path == "/api/cyber/lookup-vin":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Lookup VIN] Request: {data}")
            try:
                result = lookup_vin_warehouse(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Lookup VIN Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/check-contract-status":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Check Contract] Request: {data}")
            try:
                result = check_cyber_contract_status(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Check Contract Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/sync-ton-kho-to-supabase":
            print("[CyberSync Cloud Sync Ton Kho] Request received. Syncing ton kho to Supabase...")
            try:
                result = sync_cyber_ton_kho_to_supabase()
                invalidate_api_cache()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Sync Ton Kho Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/sync-all-to-supabase":
            print("[CyberSync Cloud Sync All] Request received. Starting full sync to Supabase...")
            try:
                result = sync_all_cyber_to_supabase()
                invalidate_api_cache()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, default=str, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                print(f"[CyberSync Cloud Sync All Error]: {str(e)}", file=sys.stderr)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/upload-pdf":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                data = json.loads(body_str or "{}")
                filename = data.get("filename", "").strip()
                b64_content = data.get("pdf_base64", "")
                if b64_content.startswith("data:application/pdf;base64,"):
                    b64_content = b64_content.split(",", 1)[1]
                
                if filename and b64_content:
                    import base64
                    clean_name = re.sub(r'[^a-zA-Z0-9_\-.]', '_', filename)
                    pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "cyber_pdfs")
                    os.makedirs(pdf_dir, exist_ok=True)
                    out_path = os.path.join(pdf_dir, clean_name)
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(b64_content))
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "filename": clean_name}, ensure_ascii=False).encode("utf-8"))
                    return
                else:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Missing filename or pdf_base64"}, ensure_ascii=False).encode("utf-8"))
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
                return

        elif parsed.path == "/api/minvoice/fetch-invoice":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                try:
                    payload = json.loads(body_str) if body_str.strip() else {}
                except Exception:
                    payload = {}
                vin = (payload.get("vin", "") or "").strip()
                only_signed = payload.get("only_signed", True)
                res = process_single_vin(vin, only_signed=only_signed)
                res_output = json.dumps(res, ensure_ascii=False)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(res_output.encode("utf-8"))
            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "status": "ERROR", "message": f"Lỗi xử lý M-Invoice: {str(e)}"}).encode("utf-8"))
            return

        elif parsed.path == "/api/minvoice/sync-and-notify":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                try:
                    payload = json.loads(body_str) if body_str.strip() else {}
                except Exception:
                    payload = {}
                vin = (payload.get("vin", "") or "").strip()
                order_number = (payload.get("orderNumber", "") or payload.get("order_number", "") or "").strip()
                res = auto_fetch_upload_and_notify(vin, order_number=order_number)
                res_output = json.dumps(res, ensure_ascii=False)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(res_output.encode("utf-8"))
            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "status": "ERROR", "message": f"Lỗi tự động xuất HĐ: {str(e)}"}).encode("utf-8"))
            return

        elif parsed.path == "/api/minvoice/batch-fetch":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                try:
                    payload = json.loads(body_str) if body_str.strip() else {}
                except Exception:
                    payload = {}
                vins = payload.get("vins", [])
                only_signed = payload.get("only_signed", True)
                results = []
                for v in vins:
                    results.append(process_single_vin(v, only_signed=only_signed))
                res_output = json.dumps({"success": True, "results": results}, ensure_ascii=False)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(res_output.encode("utf-8"))
            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "status": "ERROR", "message": f"Lỗi xử lý M-Invoice: {str(e)}"}).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/crm-metadata":
            try:
                res = get_crm_metadata()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/crm-check-duplicates":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                try:
                    payload = json.loads(body_str) if body_str.strip() else {}
                except Exception:
                    payload = {}
                phones = payload.get("phones", [])
                res = check_duplicates(phones)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        elif parsed.path == "/api/cyber/crm-import-khtn":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                try:
                    payload = json.loads(body_str) if body_str.strip() else {}
                except Exception:
                    payload = {}
                user_name = payload.get("userName") or payload.get("user_name")
                leads = payload.get("leads", [])
                ma_dvcs = payload.get("maDvcs", "02")
                ma_ttcp = payload.get("maTtcp") or payload.get("ma_ttcp") or "02.01.08"
                res = import_bulk_khtn(user_name, leads, ma_dvcs=ma_dvcs, ma_ttcp=ma_ttcp)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

def _now_utc() -> str:
    """ISO 8601 UTC timestamp với Z suffix để browser parse đúng múi giờ."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _run_auto_location_sync():
    """Execute silent all-cyber modules sync and update state. Called by scheduler thread."""
    with _auto_sync_lock:
        _auto_sync_state["last_status"] = "running"

    print("[AutoSync] 🔄 Bắt đầu tự động đồng bộ tất cả module CyberSoft lên Supabase...")
    try:
        sync_res = sync_all_cyber_to_supabase()
        now = _now_utc()
        xep_xe_up = sync_res.get("xep_xe", {}).get("updated", 0)
        ton_kho_up = sync_res.get("ton_kho", {}).get("updated", 0)
        vouchers_up = sync_res.get("voucher_tickets", {}).get("updated", 0)
        total_synced = xep_xe_up + ton_kho_up + vouchers_up
        print(f"[AutoSync] ✅ Hoàn thành đồng bộ: {xep_xe_up} xếp xe, {ton_kho_up} tồn kho, {vouchers_up} phiếu | {now}")
        invalidate_api_cache()
        with _auto_sync_lock:
            _auto_sync_state["last_run"] = now
            _auto_sync_state["last_updated_count"] = total_synced
            _auto_sync_state["last_total_cars"] = ton_kho_up
            _auto_sync_state["last_status"] = "ok"
            _auto_sync_state["last_error"] = None
    except Exception as e:
        now = _now_utc()
        print(f"[AutoSync] ❌ Lỗi tự động đồng bộ: {e}", file=sys.stderr)
        with _auto_sync_lock:
            _auto_sync_state["last_run"] = now
            _auto_sync_state["last_status"] = "error"
            _auto_sync_state["last_error"] = str(e)


def _schedule_auto_sync(interval_seconds: int = 300):
    """Recurring background scheduler thread: fire immediately then repeat every interval (default 5m)."""
    with _auto_sync_lock:
        _auto_sync_state["next_run"] = _now_utc()

    def _loop():
        import time
        while True:
            _run_auto_location_sync()
            import calendar
            next_ts = calendar.timegm(
                datetime.now(timezone.utc).timetuple()
            ) + interval_seconds
            next_run_str = datetime.utcfromtimestamp(next_ts).strftime("%Y-%m-%dT%H:%M:%SZ")
            with _auto_sync_lock:
                _auto_sync_state["next_run"] = next_run_str
            print(f"[AutoSync] ⏰ Lần tiếp theo: {next_run_str}")
            time.sleep(interval_seconds)

    t = threading.Thread(target=_loop, name="auto-location-sync", daemon=True)
    t.start()
    return t


def run():
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, CyberApiHandler)
    print(f"🚀 CyberSync Cloud API running on port {PORT}...")

    # ── Start auto-sync background thread (default every 5 minutes = 300 seconds)
    INTERVAL_MINUTES = int(os.environ.get("AUTO_SYNC_INTERVAL_MINUTES", "5"))
    with _auto_sync_lock:
        _auto_sync_state["interval_minutes"] = INTERVAL_MINUTES
    print(f"[AutoSync] 🟢 Tự động đồng bộ trạng thái xe mỗi {INTERVAL_MINUTES} phút (chạy ngầm)")
    _schedule_auto_sync(interval_seconds=INTERVAL_MINUTES * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == "__main__":
    run()
