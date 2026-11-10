"""Read-only, exact NDP order evidence. Never updates application orders."""
import base64
import json
import os
import re
import sys
import time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]

def load_config():
    for path in (ROOT / 'ndp_token_config.json', ROOT / 'scratch' / 'ndp_token.json'):
        try:
            config = json.loads(path.read_text(encoding='utf-8'))
            if config.get('accessToken'):
                return config
        except (OSError, ValueError):
            pass
    return {'accessToken': os.environ.get('NDP_ACCESS_TOKEN', '')}

def normalize(value):
    return re.sub(r'[^A-Z0-9]', '', str(value or '').upper())

def order_record(raw, dealer):
    src = raw.get('data') if isinstance(raw.get('data'), dict) else raw
    info = src.get('orderInfo') or {}
    veh = src.get('vehicle') or src.get('item') or (src.get('items') or [{}])[0]
    number = src.get('orderNumber') or src.get('orderCode') or info.get('orderNumber') or info.get('code') or src.get('recordNumber') or ''
    return {
        'orderNumber': number,
        'yanaOrderNumber': src.get('yanaOrderNumber') or info.get('yanaOrderNumber') or src.get('orderExternalNumber') or info.get('orderExternalNumber') or '',
        'vin': src.get('vinNumber') or src.get('vin') or veh.get('vinNumber') or veh.get('vin') or veh.get('chassisNumber') or '',
        'dealerCode': src.get('dealerCode') or src.get('showroomCode') or str(number)[:6] or dealer,
        'status': src.get('status') or src.get('orderStatus') or info.get('status') or '',
        'invoiceDate': src.get('invoiceDate') or src.get('invoicedAt') or info.get('invoiceDate'),
    }

def fetch_evidence(payload, session=None, config=None):
    config = config or load_config()
    token = config.get('accessToken', '')
    if not token:
        return {'success': False, 'error': 'Chưa có phiên NDP VHKD_01. Cần cập nhật đăng nhập NDP.'}
    try:
        claims = json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '==='))
        if claims.get('exp', 0) <= time.time():
            raise ValueError('expired')
        if claims.get('username') != '0925821888' or 'capability:vhkd_01' not in claims.get('permissions', []):
            raise ValueError('wrong account')
    except (ValueError, IndexError, TypeError):
        return {'success': False, 'error': 'Chưa nhận được phiên NDP còn hạn. Mở tab NDP, đăng nhập VHKD_01 và kiểm tra tiện ích báo Đã đồng bộ phiên.'}
    targets = payload.get('targets', [])
    if not isinstance(targets, list) or not 1 <= len(targets) <= 500:
        return {'success': False, 'error': 'Danh sách tra NDP không hợp lệ (tối đa 500 đơn).'}
    dealers = sorted({str(t.get('dealerCode', '')).upper() for t in targets})
    if any(not re.fullmatch(r'N319\d{2}', d) for d in dealers):
        return {'success': False, 'error': 'Thiếu hoặc sai mã đại lý N319 của đơn hàng.'}
    wanted = {normalize(n) for t in targets for n in t.get('orderNumbers', []) if normalize(n)}
    session = session or requests.Session()
    records, errors = [], {}
    headers = {'Authorization': 'Bearer ' + token, 'x-active-capability': 'capability:vhkd_01', 'x-market': 'VN', 'Accept': 'application/json'}
    deadline = time.monotonic() + 24
    for dealer in dealers:
        seen = set()
        try:
            for page in range(1, 61):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ValueError('NDP quá thời gian tra cứu; hãy tra từng đại lý hoặc từng đơn.')
                response = session.get('https://dealer-portal-api.vinfast.com/api/orders', params={'orderType': 1, 'dealerCode': dealer, 'page': page, 'limit': 100}, headers=headers, timeout=min(8, remaining))
                if response.status_code in (401, 403):
                    raise ValueError('Phiên NDP hết hạn hoặc không có quyền đại lý (HTTP ' + str(response.status_code) + ').')
                response.raise_for_status()
                body = response.json()
                items = body.get('data') if isinstance(body, dict) else body
                if isinstance(items, dict):
                    items = items.get('items') or items.get('content') or items.get('records')
                if not isinstance(items, list):
                    raise ValueError('NDP trả cấu trúc dữ liệu chưa hỗ trợ; giữ nguyên trạng thái đơn.')
                if not items:
                    break
                mapped = [order_record(item, dealer) for item in items if isinstance(item, dict)]
                signature = json.dumps(mapped, sort_keys=True)
                if signature in seen:
                    raise ValueError('NDP lặp trang; không thể xác nhận kết quả tra cứu đầy đủ.')
                seen.add(signature)
                records.extend(r for r in mapped if normalize(r['orderNumber']) in wanted or normalize(r['yanaOrderNumber']) in wanted)
            else:
                raise ValueError('Vượt giới hạn phân trang NDP; cần thu hẹp phạm vi tra cứu.')
        except requests.RequestException:
            errors[dealer] = 'Không kết nối được NDP; chưa xác nhận trạng thái xuất hóa đơn.'
        except (ValueError, TypeError, AttributeError) as exc:
            errors[dealer] = str(exc)
    # Incomplete dealer scans must never authorize a transition.
    records = [r for r in records if r['dealerCode'] not in errors]
    return {'success': True, 'records': records, 'errors': errors, 'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}

if __name__ == '__main__':
    try:
        result = fetch_evidence(json.load(sys.stdin))
    except Exception:
        result = {'success': False, 'error': 'Không thể tra cứu NDP. Trạng thái đơn được giữ nguyên.'}
    print(json.dumps(result, ensure_ascii=False))
