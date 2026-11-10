(() => {
  'use strict';
  if (location.hostname !== 'dealer-portal.vinfast.com' || window.__vfNdpSessionSync) return;
  window.__vfNdpSessionSync = true;
  let lastToken = '', lastSuccess = 0, busy = false, stopped = false;
  function readToken() {
    const raw = localStorage.getItem('accessToken');
    if (!raw) return '';
    if (raw.split('.').length === 3) return raw;
    try {
      const bin = atob(raw.replace(/-/g,'+').replace(/_/g,'/'));
      const key = 'ndp-fe-storage';
      return Array.from(bin, (c,i)=>String.fromCharCode(c.charCodeAt(0)^key.charCodeAt(i%key.length))).join('');
    } catch { return ''; }
  }
  function valid(token) {
    try {
      const data=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      return data.username==='0925821888' && data.permissions?.includes('capability:vhkd_01') && data.exp*1000>Date.now()+15000;
    } catch { return false; }
  }
  function status(text, ok) {
    let el=document.getElementById('vf-ndp-session-status');
    if(!el){el=document.createElement('div');el.id='vf-ndp-session-status';el.style.cssText='position:fixed;right:12px;bottom:8px;z-index:999999;font:11px system-ui;padding:5px 9px;border-radius:6px;pointer-events:none;background:white;box-shadow:0 1px 5px #0002';document.documentElement.appendChild(el);}
    el.textContent=text;el.style.color=ok?'#15803d':'#92400e';
  }
  async function sync(force=false) {
    if(stopped||busy)return;
    const token=readToken();
    if(!valid(token)){status('Phiên quản lý đơn: chờ NDP gia hạn / đăng nhập VHKD_01',false);return;}
    if(!force&&token===lastToken&&Date.now()-lastSuccess<60000)return;
    busy=true;
    try {
      const response=await chrome.runtime.sendMessage({type:'VF_NDP_SESSION_SYNC',accessToken:token});
      if(response?.success){lastToken=token;lastSuccess=Date.now();status('✓ Đã đồng bộ phiên với quản lý đơn',true);}
      else status('Phiên quản lý đơn: chưa kết nối máy đồng bộ',false);
    } catch(error) {
      if(String(error?.message).includes('Extension context invalidated'))stopped=true;
      status('Phiên quản lý đơn: tải lại trang hoặc kiểm tra máy đồng bộ',false);
    } finally {busy=false;}
  }
  chrome.runtime.onMessage.addListener(message=>{if(message?.type==='VF_NDP_SESSION_POLL')void sync(true);});
  window.addEventListener('storage',event=>{if(event.key==='accessToken')void sync();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
  setInterval(()=>void sync(),15000);
  void sync();
})();
