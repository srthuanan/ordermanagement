import base64
import json
import time
import unittest
from scripts.ndp_order_evidence import fetch_evidence

def config(exp=None):
    claims = {'exp': exp or time.time() + 300, 'username': '0925821888', 'permissions': ['capability:vhkd_01']}
    token = 'x.' + base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=') + '.x'
    return {'accessToken': token}

class Response:
    status_code = 200
    def __init__(self, data): self.data = data
    def json(self): return self.data
    def raise_for_status(self): pass

class Session:
    def __init__(self, pages): self.pages, self.calls = iter(pages), []
    def get(self, url, **kw):
        self.calls.append(kw)
        return Response(next(self.pages))

class NdpTests(unittest.TestCase):
    target = {'targets': [{'dealerCode': 'N31913', 'orderNumbers': ['N31913-VSO-26-08-0103']}]}
    record = {'orderNumber': 'N31913VSO2611001', 'orderInfo': {'yanaOrderNumber': 'N31913-VSO-26-08-0103'}, 'vin': 'RLNV5JSE6TH792566', 'status': 'INVOICED'}
    def test_exact_yana_and_pagination(self):
        session = Session([{'data': [self.record, {**self.record, 'orderInfo': {}, 'orderNumber': 'OTHER'}]}, {'data': []}])
        result = fetch_evidence(self.target, session, config())
        self.assertEqual(len(result['records']), 1)
        self.assertEqual(session.calls[0]['params'], {'orderType': 1, 'dealerCode': 'N31913', 'page': 1, 'limit': 100})
        self.assertEqual(len(session.calls), 2)
    def test_repeated_page_fails_closed(self):
        result = fetch_evidence(self.target, Session([{'data': [self.record]}] * 2), config())
        self.assertEqual(result['records'], [])
        self.assertIn('N31913', result['errors'])
    def test_unknown_shape_fails_closed(self):
        result = fetch_evidence(self.target, Session([{'unknown': []}]), config())
        self.assertIn('N31913', result['errors'])
    def test_expired_session(self):
        self.assertFalse(fetch_evidence(self.target, config=config(1))['success'])
    def test_invalid_dealer(self):
        self.assertFalse(fetch_evidence({'targets':[{'dealerCode':'OTHER'}]}, config=config())['success'])

if __name__ == '__main__': unittest.main()
