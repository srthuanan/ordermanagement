from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[2]


def build_shared_live_base():
    base = (root / 'public/previews/kho-xe-mau-22.html').read_text(encoding='utf-8')
    seed_start = base.index('function seedVehicles()')
    seed_end = base.index('const rail=', seed_start)
    base = base[:seed_start] + 'function seedVehicles(){return []}\nlet stock=[];\n' + base[seed_end:]
    base = base.replace("const DEMO_NOW=new Date('2026-10-29T14:15:00+07:00')", 'const DEMO_NOW=new Date()')
    base = base.replace("const USER='LÊ THỊ HƯƠNG TRÀ'", "let USER='NGƯỜI DÙNG THỬ'")
    base = base.replace('src="../pictures/${c.image}.webp"', 'src="${esc(c.image)}"')
    base = base.replace("c.model.replace(' ','')+'-'+c.version.toUpperCase()", "c.versionCode||'—'")
    base = base.replace(
        "const all=stock.filter(c=>c.model===drawerModel);",
        "const all=stock.filter(c=>c.model===drawerModel&&(!liveGroupKey||liveKey(c)===liveGroupKey));",
    )
    base = base.replace(
        '<script>\nlet drawerStep=',
        "<script>\nlet liveGroupKey='';const liveKey=c=>[c.model,c.color,c.interior].join('|');\nlet drawerStep=",
    )
    scripts = re.findall(r'<script>([\s\S]*?)</script>', base)
    bootstrap = (
        scripts[0].split('const cars=[')[0]
        + "\nconst $=id=>document.getElementById(id);const tone=s=>s==='Chưa ghép'?'#22a774':s==='Đang giữ'?'#edae27':'#3978d5';\n"
    )
    rail = re.search(r'<nav class="rail"[\s\S]*?</nav>', base).group(0)
    head = base.split('<body>')[0]
    base = (
        head
        + '<body><div class="app">'
        + rail
        + '</div><script>'
        + bootstrap
        + '</script>'
        + ''.join('<script>' + s + '</script>' for s in scripts[1:])
        + '</body></html>'
    )

    source = (root / 'utils/styleUtils.ts').read_text(encoding='utf-8')
    image_section = source[source.index('const vinfastCdnImages:') : source.index('export const getCarImage')]
    cdn = dict(re.findall(r'["\']([^"\']+)["\']\s*:\s*["\'](https://[^"\']+)["\']', image_section))
    local_images = {p.stem for p in (root / 'public/pictures').glob('*.webp')}

    shared_css = r'''
.live-source{color:#207b5c}.live-load-error{color:#b35a68}.demo-banner{align-items:center;min-height:37px}.demo-banner .live-meta{white-space:nowrap}.live-loading{font-size:13px;color:#7890b0;padding:40px 0;line-height:1.8}.simulated-label{font-size:10px;color:#9b8355;background:#fff9ed;border:1px solid #efe6d2;padding:2px 6px;border-radius:3px;display:inline-block;margin-top:5px}.demo-settings select{max-width:200px}.image-missing{height:120px;display:flex;align-items:center;justify-content:center;color:#9aabc2;font-size:11px;border-radius:5px;background:#fafbfd;margin:6px 0 8px}.drawer-subsource{color:#8ca1bd;font-size:10px}.demo-footer{line-height:1.5}.simple-row .vin-link{overflow-wrap:anywhere}.modal-content{overflow-wrap:anywhere}.group-select .group-count{font-size:11px}.demo-head{flex-wrap:wrap;gap:13px}.demo-settings{gap:9px}.demo-settings label{white-space:nowrap;font-size:10px}.demo-settings .identity{max-width:170px}.demo-toolbar{flex-wrap:wrap}.drawer-heading p{line-height:1.5}.live-warning{color:#a68555}.mode-note{line-height:1.6}.demo-banner span:first-child{line-height:1.7}.swatch{background:var(--paint,#f5f7fa);border:1px solid #c5d1e2;flex-shrink:0}.toast{pointer-events:none}
@media(max-width:1400px){.demo-settings select{max-width:155px}.demo-head{padding-top:20px}.demo-settings{gap:8px}.demo-banner{flex-wrap:wrap;gap:3px}.demo-banner .live-meta{font-size:10px}}
@media(max-width:1100px){.demo-settings{max-width:none}.demo-head{padding-bottom:14px}.demo-settings .identity{max-width:150px}}
'''

    shared_js = r'''
const LIVE_ORIGIN='https://jwvgxqrkjlbewvpkvucj.supabase.co';
const LIVE_PUBLIC_KEY='sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';
const IMAGE_CDN=IMAGE_CDN_JSON,LOCAL_IMAGES=new Set(LOCAL_IMAGES_JSON);
const READ_PATHS=new Set(['/rest/v1/khoxe','/rest/v1/car_telemetry','/rest/v1/car_hold_activities']);
const readNetwork=window.fetch.bind(window);const previewNetworkAudit=[];
window.fetch=(input,init={})=>{const u=new URL(typeof input==='string'?input:input.url,location.href);const method=String(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();previewNetworkAudit.push({method,path:u.pathname});if(method!=='GET'||u.origin!==LIVE_ORIGIN||!READ_PATHS.has(u.pathname))return Promise.reject(new Error('Bản xem trước chỉ cho phép GET từ các bảng kho xe đã chọn.'));return readNetwork(input,{...init,method:'GET'})};
let realBaseline=[],sourceLoadedAt='',loadWarnings=[],loadingLive=false;
const originalRenderDetail=renderDetail,originalDetailFields=detailFields,originalShowAction=showAction,originalDrawerVehicles=drawerVehicles,originalLiveOpen=openDrawer,originalRenderDrawer=renderDrawer;
persist=function(){};
function paintHex(colorStr){
  const s=String(colorStr||'').toLowerCase();
  const code=(s.match(/\(([^)]+)\)/)||[])[1]?.trim()||'';
  if(['ce18'].includes(code)||/white|blanc|trắng|trang/.test(s))return '#f6f8fb';
  if(['ce11','2911','3111'].includes(code)||/black|đen|den/.test(s))return '#1d232c';
  if(['ce2q','ce1m','112q','182q'].includes(code)||/red|ruby|crimson|đỏ|do/.test(s))return '#b82232';
  if(['ce1w'].includes(code)||/mint|green|xanh lá|xanhla/.test(s))return '#6c826d';
  if(['ce1v','171v','ce14','ce31'].includes(code)||/gray|grey|stealth|xám|xam/.test(s))return '#6c7582';
  if(['ce17','1117'].includes(code)||/silver|bạc|bac/.test(s))return '#c5cdd8';
  if(['ce1u','181u','111u','1u11'].includes(code)||/yellow|vàng|vang/.test(s))return '#e4bd38';
  if(['181y','182g','ce2g'].includes(code)||/sky|azure|ocean/.test(s))return '#5ca0c7';
  if(['ce22','2927'].includes(code)||/blue|xanh dương/.test(s))return '#204b87';
  if(['1821','ce21','ce2k','182k','1p2k'].includes(code)||/pink|rose|hồng/.test(s))return '#dfa2b0';
  if(['ce2o','312o'].includes(code)||/orange|cam/.test(s))return '#cf642b';
  if(['ce2j','ce2n','ce32','ce33','1132','1832','1833'].includes(code)||/beige|brown|gold|nâu/.test(s))return '#b49b7a';
  return '#dbe4f0';
}
function parseLiveDate(value){if(!value)return '';const s=String(value).trim();if(/vô thời hạn/i.test(s))return '';let date;if(/^\d{4}-\d{2}-\d{2}/.test(s))date=new Date(s.includes('T')||s.endsWith('Z')?s:s.replace(' ','T')+(s.includes(':')?'+07:00':'T00:00:00+07:00'));else{const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);if(!m)return '';date=new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${(m[4]||'00').padStart(2,'0')}:${m[5]||'00'}:${m[6]||'00'}+07:00`)}return Number.isNaN(date.getTime())?'':date.toISOString()}
function liveDateOnly(value){const s=parseLiveDate(value);return s?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s)):''}
function imageFor(c){const compact=c.model.toLowerCase().replace(/[^a-z0-9]/g,'');const aliases={limogreen:'limo',vflimo:'limo',vfmpv7:'limo',vfmpv:'limo',miniogreen:'minio',heriogreen:'herio',ecvangreen:'ecvan'};const model=aliases[compact]||compact;let code=(c.color.match(/\(([^)]+)\)/)||[])[1]?.toLowerCase().trim()||'';if(code==='182g')code='181y';const version=c.version.toLowerCase();const variant=version.includes('all new')?'allnew':version.includes('eco')?'eco':version.includes('plus')?'plus':'';const specific=variant&&IMAGE_CDN[model+'-'+variant+'-'+code];if(specific)return{src:specific,exact:true};const generic=IMAGE_CDN[model+'-'+code];if(generic)return{src:generic,exact:true};if(LOCAL_IMAGES.has(model+'-'+code))return{src:'../pictures/'+model+'-'+code+'.webp',exact:true};return{src:'',exact:false}}
function enhanceImages(scope=document){scope.querySelectorAll('img[data-live-image]').forEach(img=>{img.onerror=()=>{const message=document.createElement('div');message.className='image-missing';message.textContent='Chưa có ảnh đúng cấu hình';img.replaceWith(message)}})}
async function readRows(table,columns,extra={}){const rows=[];let offset=0,total=null;while(true){const params=new URLSearchParams({select:columns,limit:'500',offset:String(offset),...extra});const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);let response;try{response=await fetch(`${LIVE_ORIGIN}/rest/v1/${table}?${params}`,{method:'GET',headers:{apikey:LIVE_PUBLIC_KEY,Prefer:'count=exact'},signal:controller.signal,cache:'no-store',credentials:'omit'})}finally{clearTimeout(timer)}if(!response.ok){if(response.status===401||response.status===403)throw new Error('Không có quyền đọc '+table+'. Hãy mở bản xem trước bằng tài khoản có quyền xem kho; bản mẫu không tự nâng quyền.');throw new Error('Không đọc được '+table+' (HTTP '+response.status+').')}const range=response.headers.get('content-range')||'';const match=range.match(/\/(\d+)$/);if(match)total=Number(match[1]);const batch=await response.json();if(!Array.isArray(batch))throw new Error('Dữ liệu '+table+' không đúng định dạng.');rows.push(...batch);if(total!==null&&rows.length>=total)break;if(!batch.length)break;offset+=batch.length;if(total===null&&batch.length<500)break;if(offset>100000)throw new Error('Số lượng bản ghi vượt giới hạn đọc của mẫu.')}if(total!==null&&rows.length!==total)throw new Error('Dữ liệu '+table+' thay đổi trong khi tải. Hãy bấm Tải lại kho thật.');return rows}
async function readRowsByVINs(table,columns,vins,extra={}){const out=[];for(let i=0;i<vins.length;i+=120){const chunk=vins.slice(i,i+120);const inFilter='in.('+chunk.map(v=>'"'+v.replaceAll('"','')+'"').join(',')+')';const part=await readRows(table,columns,{...extra,vin:inFilter});out.push(...part)}return out}
function mapRealRows(rows,telemetry,activities){const telemetryByVIN=new Map(telemetry.map(t=>[String(t.vin||'').trim().toUpperCase(),t]));const queueByVIN=new Map();for(const a of activities){if(!['waiting','notified','prioritized'].includes(a.status)||a.type!=='QUEUE')continue;const vin=String(a.vin||'').trim().toUpperCase();const q=queueByVIN.get(vin)||[];const name=String(a.tvbh_name||a.username||'').trim();if(name&&!q.includes(name))q.push(name);queueByVIN.set(vin,q)}return rows.filter(r=>String(r.vin||'').trim()).map(r=>{const vin=String(r.vin).trim().toUpperCase();const t=telemetryByVIN.get(vin);const c={vin,model:String(r.dong_xe||'Chưa cập nhật').trim(),version:String(r.phien_ban||'').trim(),color:String(r.ngoai_that||'').trim(),interior:String(r.noi_that||'').trim(),paint:paintHex(r.ngoai_that),engine:String(r.so_may||''),dms:String(r.ma_dms||''),coc:String(r.so_coc||''),warehouse:String(r.vi_tri||''),location:String(r.vi_tri||''),parking:'',realWarehouse:'',status:String(r.trang_thai||'Chưa cập nhật').trim(),holder:String(r.nguoi_giu_xe||'').trim(),expiry:parseLiveDate(r.thoi_gian_het_han_giu),expiryText:String(r.thoi_gian_het_han_giu||''),received:liveDateOnly(r.ngay_nhap),transport:liveDateOnly(r.ngay_van_tai),versionCode:String(r.ma_phien_ban||''),notes:String(r.ghi_chu_dms||r.ghi_chu||''),queue:queueByVIN.get(vin)||[],extension:!!r.is_extension_requested,extensionReason:String(r.extension_reason||''),order:'',coords:t&&Number.isFinite(Number(t.lat))&&Number.isFinite(Number(t.lng))&&t.lat!==null&&t.lng!==null?{lat:Number(t.lat),lng:Number(t.lng),speed:Number(t.speed||0),address:'Tọa độ GPS từ dữ liệu nguồn',captured:fmt(t.captured_at)}:null,logs:[],source:'live'};c.imageInfo=imageFor(c);c.image=c.imageInfo.src;c.logs=[{time:sourceLoadedAt,text:'Đã đọc bản chụp dữ liệu kho thật. Các nhật ký thao tác tiếp theo chỉ là mô phỏng trong bộ nhớ trang.'}];return c})}
function simulatedCount(){const real=new Map(realBaseline.map(c=>[c.vin,c]));let count=0;for(const c of stock){const baseline=real.get(c.vin);if(!baseline||JSON.stringify(c)!==JSON.stringify(baseline))count++;real.delete(c.vin)}return count+real.size}
function updateLiveBanner(){const banner=document.querySelector('.demo-banner');if(!banner)return;if(loadingLive){banner.innerHTML='<span>Đang đọc kho xe thật… Chỉ gửi yêu cầu GET.</span><span class="live-meta">Các nút thao tác không ghi lên hệ thống.</span>';return}const dirty=simulatedCount();banner.innerHTML=`<span><b class="live-source">DỮ LIỆU KHO THẬT · ${realBaseline.length} XE</b> · Thao tác chỉ mô phỏng, không ghi nhận lên hệ thống.${dirty?' <span class="filter-state">Đang có '+dirty+' VIN thay đổi thử.</span>':''}${loadWarnings.length?' <span class="live-warning">'+esc(loadWarnings.join(' '))+'</span>':''}</span><span class="live-meta">Đọc lúc ${esc(sourceLoadedAt||'—')}</span>`}
log=function(c,text){c.logs.unshift({time:fmt(new Date().toISOString())+' · Mô phỏng',text});};
refresh=function(){renderStock();renderDrawer();updateLiveBanner()};
detailFields=function(c){const fields=originalDetailFields(c).map(([label,value,type])=>[label,value||'—',type]);for(const f of fields){if(f[0]==='Thời hạn'&&c.expiryText&&!c.expiry)f[1]=c.expiryText;if(f[0]==='Đơn hàng'&&!c.order)f[1]='Không có trong dữ liệu nguồn';if(f[0]==='Kho xe'&&c.location==='Đang vận tải')f[1]='—';}return fields};
function syncDrawerVersions(){const sel=$('drawer-version');if(!sel)return;const pool=stock.filter(c=>c.model===drawerModel&&(!liveGroupKey||liveKey(c)===liveGroupKey));const versions=[...new Set(pool.map(c=>c.version).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));if(drawerVersion&&!versions.includes(drawerVersion))drawerVersion='';sel.innerHTML='<option value="">Tất cả phiên bản</option>'+versions.map(v=>`<option value="${esc(v)}" ${v===drawerVersion?'selected':''}>${esc(v)}</option>`).join('')}
drawerVehicles=function(){return originalDrawerVehicles().filter(c=>!liveGroupKey||liveKey(c)===liveGroupKey)};
openDrawer=function(model,vin='',keepGroup=false){if(vin){const c=getVIN(vin);if(!keepGroup)liveGroupKey=c?liveKey(c):''}drawerModel=model;syncDrawerVersions();originalLiveOpen(model,vin)};
renderDrawer=function(){syncDrawerVersions();originalRenderDrawer()};
renderDetail=function(){originalRenderDetail();const c=getVIN(selectedVIN);if(!c)return;const root=$('vin-detail');if(!root)return;const image=root.querySelector('.detail-hero img');if(image){if(c.imageInfo?.src){image.src=c.imageInfo.src;image.setAttribute('data-live-image','')}else{const placeholder=document.createElement('div');placeholder.className='image-missing';placeholder.style.width='145px';placeholder.style.height='88px';placeholder.textContent='Chưa có ảnh';image.replaceWith(placeholder)}}const queue=root.querySelector('.queue-box>div:last-child');if(queue&&queue.textContent.includes('FIFO'))queue.textContent='Hàng chờ đọc từ nguồn. Các đăng ký/hủy chờ tại đây chỉ mô phỏng.';enhanceImages(root)};
showAction=function(c,action){originalShowAction(c,action);const notice=document.createElement('p');notice.className='mode-note';notice.textContent='CHỈ THỬ GIAO DIỆN · Không gửi yêu cầu hay cập nhật dữ liệu kho thật.';$('modal-content').prepend(notice)};
$('export-demo').onclick=()=>{const list=filteredStock();if(!list.length){message('Không có dữ liệu xe phù hợp để xuất CSV.');return}const fields=detailFields(list[0]).map(f=>f[0]);const rows=[fields,...list.map(c=>detailFields(c).map(f=>f[1]))];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='kho-xe-xem-truoc.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function restoreSnapshot(){if(loadingLive)return;if($('action-dialog').open)$('action-dialog').close();closeMore();stock=structuredClone(realBaseline);keyword='';statusChoice='';warehouseChoice='';$('stock-search').value='';$('warehouse-filter').value='';if(typeof onLiveReset==='function')onLiveReset();refresh();message('Đã hủy toàn bộ thay đổi thử, khôi phục dữ liệu kho thật đã đọc.')}
async function loadLiveStock(){if(loadingLive)return;loadingLive=true;$('load-live-stock').disabled=true;$('reset-demo').disabled=true;closeMore();closeDrawer();stock=[];realBaseline=[];sourceLoadedAt='';loadWarnings=[];renderStock();updateLiveBanner();try{const rows=await readRows('khoxe','*',{order:'vin.asc'});const vins=rows.map(r=>String(r.vin||'').trim()).filter(Boolean);let telemetry=[],activities=[];if(vins.length){const optional=await Promise.allSettled([readRowsByVINs('car_telemetry','vin,lat,lng,speed,heading,captured_at',vins,{order:'vin.asc'}),readRowsByVINs('car_hold_activities','id,vin,username,tvbh_name,type,status,created_at',vins,{order:'created_at.asc,id.asc',type:'eq.QUEUE',status:'in.(waiting,notified,prioritized)'})]);if(optional[0].status==='fulfilled')telemetry=optional[0].value;else loadWarnings.push('Chưa đọc được GPS.');if(optional[1].status==='fulfilled')activities=optional[1].value;else loadWarnings.push('Chưa đọc được hàng chờ.')}sourceLoadedAt=fmt(new Date().toISOString());stock=mapRealRows(rows,telemetry,activities);if(new Set(stock.map(c=>c.vin)).size!==stock.length)throw new Error('Dữ liệu nguồn có VIN trùng. Bản mẫu chưa hiển thị để tránh thao tác nhầm.');realBaseline=structuredClone(stock);const locations=[...new Set(stock.map(c=>c.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));$('warehouse-filter').innerHTML='<option value="">Tất cả kho</option>'+locations.map(w=>`<option>${esc(w)}</option>`).join('');$('live-identity').innerHTML='<option value="NGƯỜI DÙNG THỬ">Người dùng thử</option>'+[...new Set(stock.map(c=>c.holder).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi')).map(n=>`<option>${esc(n)}</option>`).join('');USER='NGƯỜI DÙNG THỬ';if(typeof onLiveLoaded==='function')onLiveLoaded();}catch(error){stock=[];realBaseline=[];loadingLive=false;renderStock();document.querySelector('.demo-banner').innerHTML='<span class="live-load-error">'+esc(error.name==='AbortError'?'Kết nối quá thời gian. Hãy bấm Tải lại kho thật.':error.message)+'</span>';const target=$('stock-gallery')||$('variant-workspace');if(target)target.innerHTML='<div class="live-loading" style="padding:36px 30px">Không tải được kho thật. Bản mẫu không hiển thị dữ liệu giả thay thế.<br><button class="btn" id="retry-live">Thử tải lại</button></div>';if($('retry-live'))$('retry-live').onclick=loadLiveStock;return}finally{loadingLive=false;$('load-live-stock').disabled=false;$('reset-demo').disabled=false}refresh()}
const refreshButton=document.createElement('button');refreshButton.id='load-live-stock';refreshButton.className='btn';refreshButton.textContent='Tải lại kho thật';$('reset-demo').before(refreshButton);$('reset-demo').textContent='Hủy thay đổi thử';$('reset-demo').onclick=restoreSnapshot;refreshButton.onclick=loadLiveStock;
const identity=document.createElement('label');identity.innerHTML='Người thao tác thử <select id="live-identity" class="identity"><option>Người dùng thử</option></select>';$('role').closest('label').before(identity);$('live-identity').onchange=e=>{USER=e.target.value;refresh()};$('role').innerHTML='<option value="staff">TVBH · Mô phỏng</option><option value="admin">Quản trị · Mô phỏng</option><option value="readonly">Chỉ xem</option>';
document.querySelector('.drawer-bottom span:last-child').textContent='Dữ liệu thật · Nút thao tác chỉ mô phỏng';
'''
    shared_js = shared_js.replace('IMAGE_CDN_JSON', json.dumps(cdn, ensure_ascii=False)).replace(
        'LOCAL_IMAGES_JSON', json.dumps(sorted(local_images))
    )
    policy = (
        "default-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
        "img-src 'self' data: https://shop.vinfastauto.com https://vinfastauto.com https://vinfasto2o.com https://jwvgxqrkjlbewvpkvucj.supabase.co; "
        "connect-src https://jwvgxqrkjlbewvpkvucj.supabase.co/rest/v1/khoxe https://jwvgxqrkjlbewvpkvucj.supabase.co/rest/v1/car_telemetry https://jwvgxqrkjlbewvpkvucj.supabase.co/rest/v1/car_hold_activities; "
        "form-action 'none'; object-src 'none'; base-uri 'none'"
    )
    base = base.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="' + policy + '">')
    return base, shared_css, shared_js


# ==============================================================================
# CSS & JS CHO KANBAN PRO NÂNG CẤP (KÉO THẢ, ĐẾM NGƯỢC REALTIME, METRIC RIBBON, SIDE INSPECTOR)
# ==============================================================================
css_kanban_pro = r'''
.demo-tabs{display:none}
.k-kpi-ribbon{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;padding:0 30px 12px}
.k-kpi-item{border:1px solid #dfe6f1;border-radius:8px;padding:9px 13px;background:#fff;display:flex;flex-direction:column;gap:3px}
.k-kpi-item span{font-size:10.5px;color:#788ea9}
.k-kpi-item strong{font-size:16px;color:#183254;font-weight:700}
.k-kpi-item strong small{font-size:11px;color:#209163;font-weight:600;margin-left:5px}

.kanban-toolbar{display:flex;gap:10px;align-items:center;padding:0 30px 12px;overflow-x:auto;scrollbar-width:thin}
.kanban-pill{border:1px solid #dde5f0;border-radius:999px;padding:5px 12px;font-size:11px;color:#557092;background:#fff;white-space:nowrap}
.kanban-pill:hover{border-color:#9bb7dc;background:#f7faff}
.kanban-pill.active{border-color:#205eb4;background:#edf4fe;color:#1e4f94;font-weight:600}

.kanban-pro-workspace{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 420px;border-top:1px solid var(--line);background:#fafcff}
.kanban-pro-workspace.no-inspector{grid-template-columns:minmax(0,1fr)}
.kanban-pro-workspace.no-inspector .k-side-inspector{display:none}

.kanban-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:14px 20px 20px 30px;min-height:0;overflow:hidden}
.kanban-pro-workspace.no-inspector .kanban-lanes{padding-right:30px}

.kanban-lane{display:flex;flex-direction:column;min-height:0;border:1px solid #e1e8f2;border-radius:9px;background:#fff;box-shadow:0 3px 12px #18284806;transition:border-color .15s,box-shadow .15s}
.kanban-lane.drag-target{border-color:#205eb4;box-shadow:0 0 0 2px #205eb422;background:#f9fbff}

.lane-head{padding:12px 14px;border-bottom:1px solid var(--line);background:#fbfcfe;border-radius:9px 9px 0 0;display:flex;align-items:center;justify-content:space-between;gap:8px}
.lane-head strong{display:flex;align-items:center;gap:7px;font-size:12.5px;color:#203b5c;font-weight:650}
.lane-head .lane-count{font-size:11px;padding:3px 9px;border-radius:999px;font-weight:650}

.lane-cards{flex:1;min-height:0;overflow-y:auto;padding:11px;display:flex;flex-direction:column;gap:11px;scrollbar-width:thin}

.k-card{border:1px solid #e1e9f4;border-radius:8px;background:#fff;padding:12px 13px;display:flex;flex-direction:column;gap:8px;cursor:grab;transition:box-shadow .15s,border-color .15s,transform .1s}
.k-card:hover{border-color:#b4cbe8;box-shadow:0 6px 18px #18305010;transform:translateY(-1px)}
.k-card.active-selected{border-color:#205eb4;box-shadow:0 0 0 2px #205eb433;background:#fcfdff}
.k-card:active{cursor:grabbing}

.k-card-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.k-card-title{font-size:13px;color:#183252;font-weight:650}
.k-card-loc{font-size:10px;color:#7e93af;white-space:nowrap}

.k-card-body{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center}
.k-card-img{width:72px;height:44px;object-fit:contain;cursor:pointer}
.k-card-img:hover{opacity:.85}

.k-card-meta{display:flex;flex-direction:column;gap:3px;min-width:0}
.k-vin-code{font-family:Consolas,monospace;font-size:12px;color:#20528c;font-weight:600;padding:0;text-align:left}
.k-vin-code:hover{text-decoration:underline}

.k-timer-pill{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;width:fit-content}
.k-timer-pill.fresh{background:#fef7ea;color:#b68213;border:1px solid #f6e6c2}
.k-timer-pill.urgent{background:#fdf0f0;color:#c22828;border:1px solid #f8d3d3;animation:pulseWarning 1.5s infinite}
@keyframes pulseWarning{0%,100%{opacity:1}50%{opacity:.7}}

.k-card-foot{display:flex;justify-content:space-between;align-items:center;gap:6px;padding-top:8px;border-top:1px solid #f2f5fa}
.k-card-foot .row-actions .btn{padding:5px 9px;font-size:10px}
.k-card-foot .row-actions .primary{min-width:88px}
.k-card-foot .more-button{height:26px;min-width:26px;font-size:16px}

.k-side-inspector{border-left:1px solid var(--line);min-height:0;display:flex;flex-direction:column;background:#fff}
.inspector-top{padding:12px 18px;border-bottom:1px solid var(--line);background:#fbfcfe;display:flex;justify-content:space-between;align-items:center}
.inspector-top strong{font-size:12.5px;color:#254266}
.inspector-content{flex:1;min-height:0;overflow-y:auto;padding:16px 20px;scrollbar-width:thin}

@media(max-width:1420px){
  .kanban-pro-workspace{grid-template-columns:minmax(0,1fr) 370px}
  .k-kpi-ribbon{grid-template-columns:repeat(3,minmax(0,1fr))}
  .k-kpi-item:nth-child(n+4){display:none}
}
@media(max-width:1150px){
  .kanban-pro-workspace{grid-template-columns:minmax(0,1fr)}
  .k-side-inspector{display:none}
  .kanban-lanes{grid-template-columns:1fr;overflow-y:auto;gap:16px;padding-right:30px}
  .kanban-lane{min-height:360px}
}
'''

js_kanban_pro = r'''
let kModelFilter='',kLaneSort='fifo',inspectorOpen=true,kTimerInterval=null;
let draggedVIN=null;

const origGall=$('stock-gallery');

const kpiRibbon=document.createElement('div');
kpiRibbon.id='k-kpi-ribbon';kpiRibbon.className='k-kpi-ribbon';

const kanbanToolbar=document.createElement('div');
kanbanToolbar.id='kanban-toolbar';kanbanToolbar.className='kanban-toolbar';

const kWorkspace=document.createElement('div');
kWorkspace.id='variant-workspace';kWorkspace.className='kanban-pro-workspace';
kWorkspace.innerHTML=`
  <div class="kanban-lanes" id="kanban-lanes">
    <section class="kanban-lane" id="lane-free" data-lane-type="free">
      <div class="lane-head">
        <strong><i class="mini-dot" style="--tone:#22a774"></i>1 · Sẵn sàng ghép (Tự do)</strong>
        <span class="lane-count" id="count-free" style="background:#eaf8f2;color:#19835a">0</span>
      </div>
      <div class="lane-cards" id="cards-free"></div>
    </section>

    <section class="kanban-lane" id="lane-hold" data-lane-type="hold">
      <div class="lane-head">
        <strong><i class="mini-dot" style="--tone:#edae27"></i>2 · Đang trong hạn giữ (24h)</strong>
        <span class="lane-count" id="count-hold" style="background:#fef7ea;color:#b68213">0</span>
      </div>
      <div class="lane-cards" id="cards-hold"></div>
    </section>

    <section class="kanban-lane" id="lane-match" data-lane-type="match">
      <div class="lane-head">
        <strong><i class="mini-dot" style="--tone:#3978d5"></i>3 · Đã ghép hợp đồng / Chờ giao</strong>
        <span class="lane-count" id="count-match" style="background:#edf4fe;color:#2058a5">0</span>
      </div>
      <div class="lane-cards" id="cards-match"></div>
    </section>
  </div>

  <aside class="k-side-inspector" id="k-side-inspector" aria-label="Khung soát xe nhanh">
    <div class="inspector-top">
      <strong id="k-insp-title">Hộ chiếu xe</strong>
      <button class="btn small" id="toggle-kanban-inspector">Ẩn khung →</button>
    </div>
    <div class="inspector-content" id="k-inspector-content"></div>
  </aside>
`;

origGall.replaceWith(kpiRibbon,kanbanToolbar,kWorkspace);

const toggleInspectBtn=document.createElement('button');
toggleInspectBtn.id='toggle-k-inspector-open';
toggleInspectBtn.className='btn';
toggleInspectBtn.textContent='Hiện khung soát xe';
toggleInspectBtn.hidden=true;
$('export-demo').after(toggleInspectBtn);

$('toggle-kanban-inspector').onclick=()=>{
  inspectorOpen=false;
  kWorkspace.classList.add('no-inspector');
  toggleInspectBtn.hidden=false;
};
toggleInspectBtn.onclick=()=>{
  inspectorOpen=true;
  kWorkspace.classList.remove('no-inspector');
  toggleInspectBtn.hidden=true;
  renderKanbanInspector();
};

function onLiveReset(){kModelFilter='';kLaneSort='fifo';}
function onLiveLoaded(){if(!selectedVIN&&stock.length)selectedVIN=stock[0].vin;}

function formatCountdown(expiryStr){
  if(!expiryStr)return null;
  const d=new Date(expiryStr);
  if(isNaN(d))return null;
  const diff=d-new Date();
  if(diff<=0)return {text:'Đã hết hạn 24h',urgent:true};
  const h=Math.floor(diff/3600000);
  const m=Math.floor((diff%3600000)/60000);
  const s=Math.floor((diff%60000)/1000);
  const urgent=diff<=2*3600000;
  return {text:`Còn ${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`,urgent};
}

function updateCountdownTimers(){
  document.querySelectorAll('[data-timer-vin]').forEach(el=>{
    const vin=el.dataset.timerVin;
    const c=getVIN(vin);
    if(!c||!c.expiry)return;
    const t=formatCountdown(c.expiry);
    if(t){
      el.textContent='⏱ '+t.text;
      el.className='k-timer-pill '+(t.urgent?'urgent':'fresh');
    }
  });
}
if(!kTimerInterval)kTimerInterval=setInterval(updateCountdownTimers,1000);

function renderKanbanCard(c){
  const timerInfo=c.status==='Đang giữ'&&c.expiry?formatCountdown(c.expiry):null;
  const isSelected=c.vin===selectedVIN;
  return `<article class="k-card ${isSelected?'active-selected':''}" draggable="true" data-kcard-vin="${esc(c.vin)}" tabindex="0">
    <div class="k-card-top">
      <strong class="k-card-title">${esc(c.model)} · ${esc(c.version||'Tiêu chuẩn')}</strong>
      <span class="k-card-loc">📍 ${esc(c.location||'—')}</span>
    </div>
    <div class="k-card-body">
      ${c.imageInfo?.src?`<img data-live-image class="k-card-img" src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}" title="Bấm xem thông số đầy đủ">`:'<div class="image-missing" style="height:44px">—</div>'}
      <div class="k-card-meta">
        <button class="k-vin-code" data-inspect-vin="${esc(c.vin)}">${esc(c.vin)}</button>
        <span style="font-size:10px;color:#7086a3;display:flex;align-items:center;gap:5px">
          <i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')}
        </span>
        ${timerInfo?`<span class="k-timer-pill ${timerInfo.urgent?'urgent':'fresh'}" data-timer-vin="${esc(c.vin)}">⏱ ${timerInfo.text}</span>`:''}
      </div>
    </div>
    <div class="k-card-foot">
      <small style="font-size:10px;color:#607999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${c.holder?'Giữ: '+esc(c.holder):'Nhập: '+(c.received||'—')}
      </small>
      ${actionHTML(c)}
    </div>
  </article>`;
}

function renderKanbanInspector(){
  if(!inspectorOpen)return;
  const host=$('k-inspector-content');
  const c=getVIN(selectedVIN);
  if(!c){
    host.innerHTML='<div class="empty-result">Bấm vào bất kỳ xe nào ở 3 cột để xem đầy đủ 18 trường thông số.</div>';
    $('k-insp-title').textContent='Hộ chiếu xe';
    return;
  }
  $('k-insp-title').textContent='Hộ chiếu · '+c.model+' ('+c.vin+')';
  const drawerDetail=$('vin-detail');
  const tempId=drawerDetail.id;
  drawerDetail.id='vin-detail-backup-pro';
  host.id='vin-detail';
  renderDetail();
  host.id='k-inspector-content';
  drawerDetail.id=tempId;
}

renderStock=function(){
  closeMore();
  const base=filteredStock();
  const totalCount=stock.length;
  const freeAll=stock.filter(c=>c.status==='Chưa ghép').length;
  const holdAll=stock.filter(c=>c.status==='Đang giữ').length;
  const matchAll=stock.filter(c=>c.status==='Đã ghép').length;

  kpiRibbon.innerHTML=`
    <div class="k-kpi-item"><span>Tổng tồn kho thực tế</span><strong>${totalCount} xe</strong></div>
    <div class="k-kpi-item"><span>Sẵn sàng ghép (Giao ngay)</span><strong>${freeAll} xe <small>${Math.round(freeAll/totalCount*100)}%</small></strong></div>
    <div class="k-kpi-item"><span>Đang giữ 24h</span><strong>${holdAll} xe</strong></div>
    <div class="k-kpi-item"><span>Đã ghép hợp đồng</span><strong>${matchAll} xe <small>${Math.round(matchAll/totalCount*100)}%</small></strong></div>
    <div class="k-kpi-item"><span>Bãi xe thực tế</span><strong>3 khu vực</strong></div>
  `;

  const models=['',...new Set(base.map(c=>c.model))];
  if(kModelFilter&&!models.includes(kModelFilter))kModelFilter='';
  const list=kModelFilter?base.filter(c=>c.model===kModelFilter):base;

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=list.length+' / '+stock.length+' xe';

  kanbanToolbar.innerHTML=`
    <span style="font-size:11px;color:#859bb5;margin-right:2px">Lọc dòng xe:</span>
    ${models.map(m=>`<button class="kanban-pill ${kModelFilter===m?'active':''}" data-kpill="${esc(m)}">${esc(m||'Tất cả dòng xe')} <small style="opacity:.7">(${m?base.filter(c=>c.model===m).length:base.length})</small></button>`).join('')}
  `;
  kanbanToolbar.querySelectorAll('[data-kpill]').forEach(b=>b.onclick=()=>{kModelFilter=b.dataset.kpill;renderStock()});

  const freeCars=list.filter(c=>c.status==='Chưa ghép');
  const holdCars=list.filter(c=>c.status==='Đang giữ');
  const matchCars=list.filter(c=>c.status==='Đã ghép'||(!['Chưa ghép','Đang giữ'].includes(c.status)));

  $('count-free').textContent=freeCars.length+' xe';
  $('count-hold').textContent=holdCars.length+' xe';
  $('count-match').textContent=matchCars.length+' xe';

  $('cards-free').innerHTML=freeCars.map(renderKanbanCard).join('')||'<div class="empty-result">Không có xe tự do phù hợp.</div>';
  $('cards-hold').innerHTML=holdCars.map(renderKanbanCard).join('')||'<div class="empty-result">Hiện không có xe nào đang giữ.</div>';
  $('cards-match').innerHTML=matchCars.map(renderKanbanCard).join('')||'<div class="empty-result">Chưa có xe ghép đơn hàng.</div>';

  if(!list.some(c=>c.vin===selectedVIN))selectedVIN=list[0]?.vin||'';

  // Bind selection & drag-and-drop
  kWorkspace.querySelectorAll('[data-kcard-vin]').forEach(card=>{
    card.onclick=e=>{
      if(e.target.closest('[data-action],[data-more-vin]'))return;
      selectedVIN=card.dataset.kcardVin;
      if(!inspectorOpen){
        inspectorOpen=true;
        kWorkspace.classList.remove('no-inspector');
        toggleInspectBtn.hidden=true;
      }
      renderStock();
    };
    card.ondragstart=e=>{
      draggedVIN=card.dataset.kcardVin;
      e.dataTransfer.setData('text/plain',draggedVIN);
      card.style.opacity='0.4';
    };
    card.ondragend=()=>{
      draggedVIN=null;
      card.style.opacity='1';
      document.querySelectorAll('.kanban-lane').forEach(l=>l.classList.remove('drag-target'));
    };
  });

  kWorkspace.querySelectorAll('[data-inspect-vin]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    selectedVIN=b.dataset.inspectVin;
    if(!inspectorOpen){
      inspectorOpen=true;
      kWorkspace.classList.remove('no-inspector');
      toggleInspectBtn.hidden=true;
    }
    renderStock();
  });

  // Drag target lanes
  document.querySelectorAll('.kanban-lane').forEach(lane=>{
    lane.ondragover=e=>{
      e.preventDefault();
      lane.classList.add('drag-target');
    };
    lane.ondragleave=()=>{
      lane.classList.remove('drag-target');
    };
    lane.ondrop=e=>{
      e.preventDefault();
      lane.classList.remove('drag-target');
      const vin=e.dataTransfer.getData('text/plain')||draggedVIN;
      const c=getVIN(vin);
      if(!c)return;
      const targetLane=lane.dataset.laneType;
      if(targetLane==='hold'&&c.status==='Chưa ghép'){
        showAction(c,'hold');
      }else if(targetLane==='free'&&c.status==='Đang giữ'){
        showAction(c,'release');
      }else if(targetLane==='match'&&c.status==='Đang giữ'){
        showAction(c,'match');
      }else{
        message(`Không thể kéo xe trạng thái "${c.status}" sang cột này.`);
      }
    };
  });

  bindActions(kWorkspace);
  bindMore(kWorkspace);
  enhanceImages(kWorkspace);
  renderKanbanInspector();
};

const origShowMoreKanban=showMore;
showMore=function(c,trigger){
  origShowMoreKanban(c,trigger);
  menu.querySelectorAll('[data-menu-action="detail"],[data-menu-action="logs"]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const a=b.dataset.menuAction;
    closeMore();
    selectedVIN=c.vin;
    detailTab=a==='logs'?'logs':'specs';
    if(!inspectorOpen){
      inspectorOpen=true;
      kWorkspace.classList.remove('no-inspector');
      toggleInspectBtn.hidden=true;
    }
    renderStock();
  });
};

document.querySelector('.demo-head p').textContent='Bàn điều phối Kanban Pro · Kéo thả thẻ xe giữa các cột · Đồng hồ đếm ngược 24h · Khung soát xe nhanh';
document.querySelector('.demo-footer span').textContent='MẪU 28 PRO / MẪU 33 · AUTOMOTIVE KANBAN PRO SUITE';
'''


def generate_kanban_pro():
    base, shared_css, shared_js = build_shared_live_base()
    html = base.replace('</style>', shared_css + '\n' + css_kanban_pro + '\n</style>').replace(
        '</body>', '<script>' + shared_js + '\n' + js_kanban_pro + '\nloadLiveStock();\n</script></body>'
    )
    # Upgrade kho-xe-mau-28.html
    html_28 = html.replace('Kho xe · Mẫu 22 · Chọn xe tinh gọn', 'Kho xe · Mẫu 28 Pro · Luồng xe Kanban nâng cấp')
    (root / 'public/previews/kho-xe-mau-28.html').write_text(html_28, encoding='utf-8')
    print('Upgraded kho-xe-mau-28.html')

    # Also save as kho-xe-mau-33.html
    html_33 = html.replace(
        'Kho xe · Mẫu 22 · Chọn xe tinh gọn', 'Kho xe · Mẫu 33 · Kanban Pro Kéo Thả & Đếm Ngược 24h & Khung Soát Xe'
    )
    (root / 'public/previews/kho-xe-mau-33.html').write_text(html_33, encoding='utf-8')
    print('Created kho-xe-mau-33.html')


if __name__ == '__main__':
    generate_kanban_pro()

