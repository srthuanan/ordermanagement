import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from datetime import datetime

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
    get_cyber_voucher_tickets
)

PORT = int(os.environ.get("PORT", 8080))

class CyberApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
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

        elif parsed.path == "/api/cyber/voucher-tickets":
            try:
                from urllib.parse import parse_qs
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

        elif parsed.path == "/api/cyber/search-factory-plan":
            content_len = int(self.headers.get("Content-Length", 0))
            body_str = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
            try:
                data = json.loads(body_str or "{}")
            except Exception:
                data = {}

            print(f"[CyberSync Cloud Search] Request: {data}")
            try:
                result = search_cyber_factory_plan(data)
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

            print(f"[CyberSync Cloud Ton Kho Report] Request: {data}")
            try:
                result = get_cyber_ton_kho_report(data)
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

            print(f"[CyberSync Cloud Xep Xe Contracts] Request: {data}")
            try:
                result = get_cyber_xep_xe_contracts(data)
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

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

def run():
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, CyberApiHandler)
    print(f"🚀 CyberSync Cloud API running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == "__main__":
    run()
