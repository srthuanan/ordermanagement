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


def write_variant(filename, title, extra_css, extra_js):
    base, shared_css, shared_js = build_shared_live_base()
    html = base.replace('</style>', shared_css + '\n' + extra_css + '\n</style>').replace(
        '</body>', '<script>' + shared_js + '\n' + extra_js + '\nloadLiveStock();\n</script></body>'
    )
    html = html.replace('Kho xe · Mẫu 22 · Chọn xe tinh gọn', title)
    (root / 'public/previews' / filename).write_text(html, encoding='utf-8')
    print('Created', filename)


# ==============================================================================
# MẪU 28: Automotive Kanban Board (3 Cột Trạng Thái Luồng Xe)
# ==============================================================================
css_28 = r'''
.demo-tabs{margin-bottom:12px}
.kanban-strip{display:flex;gap:8px;padding:0 30px 14px;overflow-x:auto;scrollbar-width:thin}
.kanban-pill{border:1px solid #dde5f0;border-radius:999px;padding:5px 13px;font-size:11px;color:#557092;background:#fff;white-space:nowrap}
.kanban-pill:hover{border-color:#9bb7dc;background:#f7faff}
.kanban-pill.active{border-color:#205eb4;background:#edf4fe;color:#1e4f94;font-weight:600}
.kanban-board{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:0 30px 22px;border-top:1px solid var(--line);background:#fafcff}
.kanban-col{display:flex;flex-direction:column;min-height:0;border:1px solid #e1e8f2;border-radius:8px;background:#fff;box-shadow:0 2px 10px #18284806}
.kanban-head{padding:13px 16px;border-bottom:1px solid var(--line);background:#fbfcfe;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;gap:8px}
.kanban-head strong{display:flex;align-items:center;gap:7px;font-size:12.5px;color:#223c5c;font-weight:650}
.kanban-head .badge{font-size:10px;padding:3px 8px;border-radius:999px;font-weight:600}
.kanban-cards{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:11px;scrollbar-width:thin}
.k-card{border:1px solid #e2eaf4;border-radius:7px;background:#fff;padding:12px 14px;display:flex;flex-direction:column;gap:8px;transition:box-shadow .15s,border-color .15s}
.k-card:hover{border-color:#b4cbe8;box-shadow:0 4px 15px #1830500e}
.k-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.k-top strong{font-size:13px;color:#183252}
.k-top small{font-size:10px;color:#859bb7}
.k-body{display:grid;grid-template-columns:68px minmax(0,1fr);gap:10px;align-items:center}
.k-body img{width:68px;height:42px;object-fit:contain}
.k-body .image-missing{width:68px;height:42px;margin:0;font-size:9px}
.k-info{display:flex;flex-direction:column;gap:3px;min-width:0}
.k-vin-btn{font-family:Consolas,monospace;font-size:11.5px;color:#22528c;font-weight:600;padding:0;text-align:left}
.k-vin-btn:hover{text-decoration:underline}
.k-meta{font-size:10px;color:#788ea9;display:flex;align-items:center;gap:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.k-bot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:8px;border-top:1px solid #f0f3f8}
.k-bot .sub-text{font-size:10px;color:#5a7698;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.k-bot .row-actions .btn{padding:5px 9px;font-size:10px}
.k-bot .row-actions .primary{min-width:88px}
.k-bot .more-button{height:26px;min-width:26px;font-size:16px}
@media(max-width:1200px){.kanban-board{grid-template-columns:1fr;gap:14px;overflow-y:auto;padding-bottom:20px}}
'''

js_28 = r'''
let kModelFilter='';
const gall28=$('stock-gallery');
const kStrip=document.createElement('div');
kStrip.id='kanban-strip';kStrip.className='kanban-strip';
const kBoard=document.createElement('div');
kBoard.id='variant-workspace';kBoard.className='kanban-board';
kBoard.innerHTML=`
  <div class="kanban-col"><div class="kanban-head"><strong><i class="mini-dot" style="--tone:#22a774"></i>Sẵn sàng ghép (Chưa ghép)</strong><span class="badge" id="kb-badge-free" style="background:#eaf8f2;color:#1b845c">0</span></div><div class="kanban-cards" id="k-col-free"></div></div>
  <div class="kanban-col"><div class="kanban-head"><strong><i class="mini-dot" style="--tone:#edae27"></i>Đang trong hạn giữ (24h)</strong><span class="badge" id="kb-badge-hold" style="background:#fef7ea;color:#b68213">0</span></div><div class="kanban-cards" id="k-col-hold"></div></div>
  <div class="kanban-col"><div class="kanban-head"><strong><i class="mini-dot" style="--tone:#3978d5"></i>Đã ghép hợp đồng / Chờ xuất</strong><span class="badge" id="kb-badge-match" style="background:#edf4fe;color:#2058a5">0</span></div><div class="kanban-cards" id="k-col-match"></div></div>
`;
gall28.replaceWith(kStrip,kBoard);

function renderKCard(c){
  return `<article class="k-card">
    <div class="k-top"><strong>${esc(c.model)} · ${esc(c.version||'Tiêu chuẩn')}</strong><small>${esc(c.location||'—')}</small></div>
    <div class="k-body">
      ${c.imageInfo?.src?`<img data-live-image src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing">—</div>'}
      <div class="k-info">
        <button class="k-vin-btn" data-open-kvin="${esc(c.vin)}">${esc(c.vin)}</button>
        <span class="k-meta"><i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')}</span>
        <span class="k-meta">DMS: ${esc(c.dms||'—')} · Máy: ${esc(c.engine||'—')}</span>
      </div>
    </div>
    <div class="k-bot">
      <span class="sub-text">${c.holder?'Giữ: '+esc(c.holder)+(c.expiry?' ('+fmt(c.expiry)+')':''):'Kho: '+esc(c.location||'—')}</span>
      ${actionHTML(c)}
    </div>
  </article>`;
}

renderStock=function(){
  closeMore();
  const base=filteredStock();
  const models=['',...new Set(base.map(c=>c.model))];
  if(kModelFilter&&!models.includes(kModelFilter))kModelFilter='';
  const list=kModelFilter?base.filter(c=>c.model===kModelFilter):base;

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=list.length+' / '+stock.length+' xe';
  $('stock-tabs').style.display='none';

  kStrip.innerHTML=models.map(m=>`<button class="kanban-pill ${kModelFilter===m?'active':''}" data-kp="${esc(m)}">${esc(m||'Tất cả dòng xe')} <small style="opacity:.7">(${m?base.filter(c=>c.model===m).length:base.length})</small></button>`).join('');
  kStrip.querySelectorAll('[data-kp]').forEach(b=>b.onclick=()=>{kModelFilter=b.dataset.kp;renderStock()});

  const free=list.filter(c=>c.status==='Chưa ghép');
  const hold=list.filter(c=>c.status==='Đang giữ');
  const match=list.filter(c=>c.status==='Đã ghép'||(!['Chưa ghép','Đang giữ'].includes(c.status)));

  $('kb-badge-free').textContent=free.length+' xe';
  $('kb-badge-hold').textContent=hold.length+' xe';
  $('kb-badge-match').textContent=match.length+' xe';

  $('k-col-free').innerHTML=free.map(renderKCard).join('')||'<div class="empty-result">Không có xe chưa ghép.</div>';
  $('k-col-hold').innerHTML=hold.map(renderKCard).join('')||'<div class="empty-result">Hiện không có xe đang giữ.</div>';
  $('k-col-match').innerHTML=match.map(renderKCard).join('')||'<div class="empty-result">Chưa có xe ghép hợp đồng.</div>';

  kBoard.querySelectorAll('[data-open-kvin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openKvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions(kBoard);
  bindMore(kBoard);
  enhanceImages(kBoard);
};
document.querySelector('.demo-head p').textContent='Kanban 3 cột luồng xe (Sẵn sàng ➔ Đang giữ ➔ Đã ghép) · Giữ xe 24h & đổi xe 1 chạm';
document.querySelector('.demo-footer span').textContent='MẪU 28 · AUTOMOTIVE KANBAN BOARD · DỮ LIỆU KHO THẬT';
'''

write_variant('kho-xe-mau-28.html', 'Kho xe · Mẫu 28 · Luồng xe Kanban 3 trạng thái', css_28, js_28)


# ==============================================================================
# MẪU 29: Visual Yard Map & Bay Management (Bản Đồ Bãi Đỗ & Phân Khu Vật Lý)
# ==============================================================================
css_29 = r'''
.demo-tabs{margin-bottom:12px}
.yard-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:0 30px 14px}
.yard-zone-card{border:1px solid #dde6f2;border-radius:8px;padding:12px 14px;background:#fff;text-align:left;display:flex;flex-direction:column;gap:5px;cursor:pointer;transition:border-color .15s}
.yard-zone-card:hover{border-color:#a1bede;background:#f8fbff}
.yard-zone-card.active{border-color:#205eb4;background:#edf4fe;box-shadow:inset 3px 0 #205eb4}
.yard-zone-card strong{font-size:12.5px;color:#1e3758;display:flex;justify-content:space-between;align-items:center}
.yard-zone-card span{font-size:11px;color:#7b91ad}
.yard-zone-card b{color:#1e875e;font-size:13px;font-weight:650}
.yard-grid{flex:1;min-height:0;overflow-y:auto;padding:2px 30px 22px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;scrollbar-width:thin}
.bay-card{border:1px solid #e1e9f4;border-radius:8px;background:#fff;padding:13px 15px;display:flex;flex-direction:column;gap:8px;position:relative}
.bay-card:hover{border-color:#b4cbe8}
.bay-tag{font-size:9.5px;color:#798ea8;background:#f3f6fa;border:1px solid #e1e7f0;padding:2px 6px;border-radius:4px;display:inline-block;width:fit-content}
.bay-img{width:100%;height:96px;object-fit:contain;margin:2px 0}
.bay-vin-btn{font-family:Consolas,monospace;font-size:11.5px;color:#245490;font-weight:600;padding:0;text-align:left}
.bay-vin-btn:hover{text-decoration:underline}
.bay-foot{display:flex;justify-content:space-between;align-items:center;gap:6px;padding-top:8px;border-top:1px solid #f0f3f8}
.bay-foot .row-actions .btn{padding:5px 8px;font-size:10px}
.bay-foot .row-actions .primary{min-width:86px}
.bay-foot .more-button{height:26px;min-width:26px;font-size:16px}
@media(max-width:1420px){.yard-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.yard-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:980px){.yard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''

js_29 = r'''
let yardChoice='';
const gall29=$('stock-gallery');
const ySummary=document.createElement('div');
ySummary.id='yard-summary';ySummary.className='yard-summary';
const yGrid=document.createElement('div');
yGrid.id='variant-workspace';yGrid.className='yard-grid';
gall29.replaceWith(ySummary,yGrid);

renderStock=function(){
  closeMore();
  const base=filteredStock();
  const locations=['',...new Set(base.map(c=>c.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  if(yardChoice&&!locations.includes(yardChoice))yardChoice='';
  const list=yardChoice?base.filter(c=>c.location===yardChoice):base;

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=list.length+' / '+stock.length+' xe';
  $('stock-tabs').style.display='none';

  ySummary.innerHTML=locations.map(loc=>{
    const g=loc?base.filter(c=>c.location===loc):base;
    return `<button class="yard-zone-card ${yardChoice===loc?'active':''}" data-yloc="${esc(loc)}">
      <strong><span>📍 ${esc(loc||'Toàn bộ các bãi xe')}</span><b>${g.filter(x=>x.status==='Chưa ghép').length} trống</b></strong>
      <span>${g.length} xe tại bãi · ${g.filter(x=>x.status==='Đang giữ').length} giữ · ${g.filter(x=>x.status==='Đã ghép').length} ghép</span>
    </button>`;
  }).join('');
  ySummary.querySelectorAll('[data-yloc]').forEach(b=>b.onclick=()=>{yardChoice=b.dataset.yloc;renderStock()});

  yGrid.innerHTML=list.map(c=>`<article class="bay-card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span class="bay-tag">📍 ${esc(c.location||'Kho trung tâm')}</span>
      <span class="status" style="--tone:${tone(c.status)};font-size:10px">${esc(c.status)}</span>
    </div>
    ${c.imageInfo?.src?`<img data-live-image class="bay-img" src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing" style="height:96px">—</div>'}
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <strong style="font-size:13px;color:#1a3354">${esc(c.model)} · ${esc(c.version||'Tiêu chuẩn')}</strong>
      <small style="font-size:10px;color:#7e93af"><i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')}</small>
    </div>
    <div><button class="bay-vin-btn" data-open-bayvin="${esc(c.vin)}">${esc(c.vin)}</button></div>
    <div class="bay-foot">
      <small style="font-size:10px;color:#6782a2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.holder?'Giữ: '+esc(c.holder):'Nhập: '+(c.received||'—')}</small>
      ${actionHTML(c)}
    </div>
  </article>`).join('')||'<div class="empty-result">Không có xe trong khu vực bãi đỗ này.</div>';

  yGrid.querySelectorAll('[data-open-bayvin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openBayvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions(yGrid);
  bindMore(yGrid);
  enhanceImages(yGrid);
};
document.querySelector('.demo-head p').textContent='Quản lý bãi đỗ & phân khu kho vật lý (Thuận An, QL13, Vận tải) · Tìm xe theo bãi siêu nhanh';
document.querySelector('.demo-footer span').textContent='MẪU 29 · VISUAL YARD MAP & BAY MANAGEMENT';
'''

write_variant('kho-xe-mau-29.html', 'Kho xe · Mẫu 29 · Bản đồ bãi đỗ & phân khu', css_29, js_29)


# ==============================================================================
# MẪU 30: Spotlight Search & Instant Car Finder (Tra Cứu Thông Minh 1-Chạm)
# ==============================================================================
css_30 = r'''
.demo-toolbar{display:none}
.demo-tabs{display:none}
.spotlight-box{padding:0 30px 14px}
.spotlight-bar{display:flex;align-items:center;gap:12px;border:2px solid #205eb4;border-radius:10px;background:#fff;padding:8px 16px;box-shadow:0 6px 25px #205eb414}
.spotlight-bar svg{width:22px;height:22px;color:#205eb4}
.spotlight-bar input{border:0;outline:0;font-size:14px;color:#183152;flex:1;min-width:0;background:transparent}
.facet-row{display:flex;gap:8px;padding-top:10px;overflow-x:auto;scrollbar-width:thin}
.facet-chip{border:1px solid #dde5f2;border-radius:6px;padding:6px 11px;font-size:11px;color:#526d8f;background:#fff;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.facet-chip:hover{border-color:#9cb7dc;background:#f8fbff}
.facet-chip.active{border-color:#205eb4;background:#edf4fe;color:#1b4f99;font-weight:600}
.spotlight-grid{flex:1;min-height:0;overflow-y:auto;padding:2px 30px 22px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;scrollbar-width:thin}
.spot-card{border:1px solid #e1e9f4;border-radius:9px;background:#fff;padding:14px 16px;display:flex;flex-direction:column;gap:9px}
.spot-card:hover{border-color:#b4cce8;box-shadow:0 6px 20px #152b480c}
.spot-top{display:flex;justify-content:space-between;align-items:baseline}
.spot-top h3{font-size:15px;margin:0;font-weight:650;color:#1a3456}
.spot-img{width:100%;height:102px;object-fit:contain}
.spot-vin{font-family:Consolas,monospace;font-size:12px;color:#205494;font-weight:600;padding:0;text-align:left}
.spot-vin:hover{text-decoration:underline}
.spot-actions{display:flex;justify-content:space-between;align-items:center;gap:6px;padding-top:8px;border-top:1px solid #f0f3f8}
.spot-actions .btn{padding:6px 10px;font-size:10.5px}
.spot-actions .primary{min-width:96px}
.spot-actions .more-button{height:28px;min-width:28px;font-size:17px}
@media(max-width:1420px){.spotlight-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:980px){.spotlight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''

js_30 = r'''
let spotFacetModel='',spotFacetStatus='',spotFacetWarehouse='',spotQuery='';
const gall30=$('stock-gallery');
const sBox=document.createElement('div');
sBox.id='spotlight-box';sBox.className='spotlight-box';
sBox.innerHTML=`
  <div class="spotlight-bar">
    ${icon('search')}
    <input id="spot-search-input" placeholder="Gõ tìm nhanh bất kỳ thông tin nào: số VIN, dòng xe, màu sơn, số máy, mã DMS, người giữ…" aria-label="Tìm kiếm xe thông minh">
    <button class="btn" id="spot-clear" style="padding:4px 9px;font-size:11px">Xóa</button>
  </div>
  <div class="facet-row" id="spot-facets"></div>
`;
const sGrid=document.createElement('div');
sGrid.id='variant-workspace';sGrid.className='spotlight-grid';
gall30.replaceWith(sBox,sGrid);

$('spot-search-input').oninput=e=>{spotQuery=e.target.value.toLowerCase();renderStock()};
$('spot-clear').onclick=()=>{spotQuery='';$('spot-search-input').value='';renderStock()};

renderStock=function(){
  closeMore();
  const base=stock.filter(c=>{
    const q=spotQuery;
    const matchQ=!q||`${c.vin} ${c.model} ${c.version} ${c.color} ${c.interior} ${c.dms} ${c.engine} ${c.coc} ${c.holder} ${c.location}`.toLowerCase().includes(q);
    const matchM=!spotFacetModel||c.model===spotFacetModel;
    const matchS=!spotFacetStatus||c.status===spotFacetStatus;
    const matchW=!spotFacetWarehouse||c.location===spotFacetWarehouse;
    return matchQ&&matchM&&matchS&&matchW;
  });

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=base.length+' / '+stock.length+' xe';

  const models=['',...new Set(stock.map(c=>c.model))];
  const statuses=['',...new Set(stock.map(c=>c.status))];

  $('spot-facets').innerHTML=`
    <span style="font-size:11px;color:#859bb5;align-self:center;margin-right:2px">Lọc nhanh:</span>
    <button class="facet-chip ${!spotFacetStatus?'active':''}" data-fstatus="">Tất cả trạng thái (${stock.length})</button>
    <button class="facet-chip ${spotFacetStatus==='Chưa ghép'?'active':''}" data-fstatus="Chưa ghép"><i class="mini-dot" style="--tone:#22a774"></i>Chưa ghép (${stock.filter(c=>c.status==='Chưa ghép').length})</button>
    <button class="facet-chip ${spotFacetStatus==='Đang giữ'?'active':''}" data-fstatus="Đang giữ"><i class="mini-dot" style="--tone:#edae27"></i>Đang giữ (${stock.filter(c=>c.status==='Đang giữ').length})</button>
    <button class="facet-chip ${spotFacetStatus==='Đã ghép'?'active':''}" data-fstatus="Đã ghép"><i class="mini-dot" style="--tone:#3978d5"></i>Đã ghép (${stock.filter(c=>c.status==='Đã ghép').length})</button>
    <span style="border-right:1px solid #dce4f0;height:18px;align-self:center;margin:0 4px"></span>
    ${models.map(m=>`<button class="facet-chip ${spotFacetModel===m?'active':''}" data-fmodel="${esc(m)}">${esc(m||'Tất cả dòng')}</button>`).join('')}
  `;

  $('spot-facets').querySelectorAll('[data-fstatus]').forEach(b=>b.onclick=()=>{spotFacetStatus=b.dataset.fstatus;renderStock()});
  $('spot-facets').querySelectorAll('[data-fmodel]').forEach(b=>b.onclick=()=>{spotFacetModel=b.dataset.fmodel;renderStock()});

  sGrid.innerHTML=base.map(c=>`<article class="spot-card">
    <div class="spot-top">
      <h3>${esc(c.model)} <small style="font-size:11px;font-weight:400;color:#788da8">${esc(c.version||'Tiêu chuẩn')}</small></h3>
      <span class="status" style="--tone:${tone(c.status)};font-size:10px">${esc(c.status)}</span>
    </div>
    ${c.imageInfo?.src?`<img data-live-image class="spot-img" src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing" style="height:102px">—</div>'}
    <div><button class="spot-vin" data-open-spotvin="${esc(c.vin)}">${esc(c.vin)}</button></div>
    <div style="font-size:10.5px;color:#6f86a4;display:flex;justify-content:space-between">
      <span><i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')}</span>
      <span>${esc(c.location||'—')}</span>
    </div>
    <div class="spot-actions">
      <small style="font-size:10px;color:#607c9e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.holder?'Giữ: '+esc(c.holder):'Chưa có người giữ'}</small>
      ${actionHTML(c)}
    </div>
  </article>`).join('')||'<div class="empty-result">Không tìm thấy xe nào khớp với điều kiện tra cứu.</div>';

  sGrid.querySelectorAll('[data-open-spotvin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openSpotvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions(sGrid);
  bindMore(sGrid);
  enhanceImages(sGrid);
};
document.querySelector('.demo-head p').textContent='Tìm kiếm thông minh 1-chạm (Omni-Search) · Lọc nhiều chiều Facets · Trả kết quả tức thì';
document.querySelector('.demo-footer span').textContent='MẪU 30 · SPOTLIGHT SEARCH & INSTANT CAR FINDER';
'''

write_variant('kho-xe-mau-30.html', 'Kho xe · Mẫu 30 · Tra cứu thông minh 1-chạm', css_30, js_30)


# ==============================================================================
# MẪU 31: Cross-Matrix Stock Summary (Ma Trận 2 Chiều Dòng Xe × Màu Sắc)
# ==============================================================================
css_31 = r'''
.demo-tabs{margin-bottom:12px}
.matrix-grid-shell{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--line);background:#fff}
.matrix-scroll{flex:1;min-height:0;overflow:auto;padding:0 30px;scrollbar-width:thin}
.c-matrix{width:100%;border-collapse:collapse;font-size:12px;margin:18px 0}
.c-matrix th{position:sticky;top:0;z-index:3;background:#fbfcfe;border:1px solid #dbe4f0;padding:12px 10px;font-size:11px;color:#354e70;text-align:center;white-space:nowrap}
.c-matrix th:first-child{left:0;z-index:4;text-align:left;min-width:140px;background:#f8fafc}
.c-matrix td{border:1px solid #e2eaf4;padding:8px;text-align:center;vertical-align:middle;transition:background .12s}
.c-matrix td:first-child{position:sticky;left:0;z-index:2;background:#fcfdfe;text-align:left;padding:10px 14px;font-weight:650;font-size:13px;color:#183252}
.c-matrix td.has-cars{cursor:pointer}
.c-matrix td.has-cars:hover{background:#edf4fe}
.c-matrix td.active-cell{background:#e2edfd;outline:2px solid #205eb4;outline-offset:-2px}
.cell-badge{display:flex;flex-direction:column;align-items:center;gap:3px}
.cell-badge strong{font-size:14px;color:#1b395d}
.cell-badge small{font-size:9.5px;color:#1d8c62;font-weight:600}
.matrix-drawer-tray{border-top:1px solid var(--line);background:#fbfcfe;padding:14px 30px;min-height:160px;max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.matrix-tray-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.matrix-tray-head strong{font-size:13px;color:#1c3658}
.tray-vin-row{display:grid;grid-template-columns:180px 140px 1fr 140px auto;gap:12px;align-items:center;padding:9px 12px;border:1px solid #dde5f0;border-radius:6px;background:#fff;font-size:11.5px}
.tray-vin-row:hover{border-color:#adc4e2}
.tray-vin-row .vin-btn{font-family:Consolas,monospace;font-size:12px;color:#22528c;font-weight:600;padding:0;text-align:left}
@media(max-width:1200px){.tray-vin-row{grid-template-columns:160px 1fr auto}}
'''

js_31 = r'''
let matrixCellModel='',matrixCellColor='';
const gall31=$('stock-gallery');
const mShell=document.createElement('div');
mShell.id='variant-workspace';mShell.className='matrix-grid-shell';
mShell.innerHTML=`
  <div class="matrix-scroll"><table class="c-matrix" id="c-matrix-table"></table></div>
  <div class="matrix-drawer-tray" id="matrix-tray"></div>
`;
gall31.replaceWith(mShell);

renderStock=function(){
  closeMore();
  const base=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=base.length+' / '+stock.length+' xe';

  const models=[...new Set(base.map(c=>c.model))].sort();
  const colors=[...new Set(base.map(c=>c.color))].sort();

  if(!matrixCellModel&&models.length){matrixCellModel=models[0];matrixCellColor=colors[0]}

  $('c-matrix-table').innerHTML=`
    <thead><tr>
      <th>Dòng xe \\ Màu sắc</th>
      ${colors.map(col=>`<th><div style="display:flex;align-items:center;justify-content:center;gap:6px"><i class="swatch" style="--paint:${paintHex(col)};width:10px;height:10px;margin:0"></i><span>${esc(col)}</span></div></th>`).join('')}
    </tr></thead>
    <tbody>
      ${models.map(m=>`<tr>
        <td>${esc(m)}</td>
        ${colors.map(col=>{
          const matched=base.filter(c=>c.model===m&&c.color===col);
          const isAct=matrixCellModel===m&&matrixCellColor===col;
          if(!matched.length)return `<td style="color:#a8b7cb;background:#fdfdfe">—</td>`;
          const avail=matched.filter(c=>c.status==='Chưa ghép').length;
          return `<td class="has-cars ${isAct?'active-cell':''}" data-mcell="${esc(m)}" data-ccell="${esc(col)}">
            <div class="cell-badge">
              <strong>${matched.length} xe</strong>
              <small>${avail} chưa ghép</small>
            </div>
          </td>`;
        }).join('')}
      </tr>`).join('')}
    </tbody>
  `;

  $('c-matrix-table').querySelectorAll('[data-mcell]').forEach(td=>td.onclick=()=>{
    matrixCellModel=td.dataset.mcell;
    matrixCellColor=td.dataset.ccell;
    renderStock();
  });

  const trayPool=base.filter(c=>c.model===matrixCellModel&&c.color===matrixCellColor);
  $('matrix-tray').innerHTML=`
    <div class="matrix-tray-head">
      <strong>Chi tiết danh sách: ${esc(matrixCellModel)} · ${esc(matrixCellColor)} (${trayPool.length} xe)</strong>
      <button class="btn" id="open-full-drawer-31" style="font-size:11px">Mở bảng chi tiết đầy đủ →</button>
    </div>
    ${trayPool.map(c=>`<div class="tray-vin-row">
      <div><button class="vin-btn" data-tray-vin="${esc(c.vin)}">${esc(c.vin)}</button></div>
      <div><span class="status" style="--tone:${tone(c.status)}">${esc(c.status)}</span></div>
      <div style="color:#607a9b">${esc(c.version||'Tiêu chuẩn')} · Kho: ${esc(c.location||'—')} · Máy: ${esc(c.engine||'—')}</div>
      <div style="font-size:10px;color:#7089a7">${c.holder?'Giữ: '+esc(c.holder):'Chưa có người giữ'}</div>
      <div>${actionHTML(c)}</div>
    </div>`).join('')||'<div class="empty-result" style="padding:16px 0">Không có xe trong ô ma trận này.</div>'}
  `;

  $('open-full-drawer-31').onclick=()=>{const c=trayPool[0];if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}};
  $('matrix-tray').querySelectorAll('[data-tray-vin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.trayVin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions($('matrix-tray'));
  bindMore($('matrix-tray'));
};
document.querySelector('.demo-head p').textContent='Ma trận 2 chiều Dòng xe × Màu sắc · Bấm ô bất kỳ xem danh sách xe bên dưới tức thì';
document.querySelector('.demo-footer span').textContent='MẪU 31 · CROSS-MATRIX STOCK SUMMARY';
'''

write_variant('kho-xe-mau-31.html', 'Kho xe · Mẫu 31 · Ma trận dòng xe và màu sắc', css_31, js_31)


# ==============================================================================
# MẪU 32: Aging Fleet & FIFO Timeline (Phân Nhóm Tuổi Tồn Kho & Ưu Tiên Bán)
# ==============================================================================
css_32 = r'''
.demo-tabs{margin-bottom:12px}
.aging-banner-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:0 30px 14px}
.aging-tier-card{border:1px solid #dde5f0;border-radius:8px;padding:12px 16px;background:#fff;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.aging-tier-card:hover{border-color:#a2bedf}
.aging-tier-card.active{border-color:#205eb4;background:#edf4fe;box-shadow:inset 3px 0 #205eb4}
.aging-tier-card strong{font-size:13px;display:flex;align-items:center;gap:7px}
.aging-tier-card b{font-size:16px;font-weight:700}
.aging-feed{flex:1;min-height:0;overflow-y:auto;padding:2px 30px 22px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin}
.aging-row{border:1px solid #dfe7f2;border-radius:8px;background:#fff;padding:14px 18px;display:grid;grid-template-columns:72px 190px 1fr 150px auto;gap:16px;align-items:center}
.aging-row:hover{border-color:#b4cae4;box-shadow:0 4px 14px #182d4c0b}
.aging-row img{width:72px;height:46px;object-fit:contain}
.aging-row .image-missing{width:72px;height:46px;margin:0;font-size:9px}
.aging-pill{font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;display:inline-block;width:fit-content}
.aging-pill.urgent{background:#fdf0f0;color:#c22828;border:1px solid #f9d5d5}
.aging-pill.normal{background:#fef8ea;color:#b47c0b;border:1px solid #f8e9c2}
.aging-pill.fresh{background:#eefaf3;color:#188a5c;border:1px solid #ccefdc}
.aging-vin-btn{font-family:Consolas,monospace;font-size:12.5px;color:#22528d;font-weight:600;padding:0;text-align:left}
.aging-vin-btn:hover{text-decoration:underline}
@media(max-width:1200px){.aging-row{grid-template-columns:60px 150px 1fr auto}.aging-hide-md{display:none}}
'''

js_32 = r'''
let agingChoice='';
const gall32=$('stock-gallery');
const aStrip=document.createElement('div');
aStrip.id='aging-strip';aStrip.className='aging-banner-strip';
const aFeed=document.createElement('div');
aFeed.id='variant-workspace';aFeed.className='aging-feed';
gall32.replaceWith(aStrip,aFeed);

function getAgeDays(c){
  if(!c.received)return 5;
  const d=new Date(c.received);
  if(isNaN(d))return 5;
  return Math.max(1,Math.floor((new Date() - d)/(24*3600*1000)));
}

renderStock=function(){
  closeMore();
  const base=filteredStock().map(c=>({...c,ageDays:getAgeDays(c)})).sort((a,b)=>b.ageDays-a.ageDays);

  const urgent=base.filter(c=>c.ageDays>=30);
  const mid=base.filter(c=>c.ageDays>=15&&c.ageDays<30);
  const fresh=base.filter(c=>c.ageDays<15);

  const pool=agingChoice==='urgent'?urgent:agingChoice==='mid'?mid:agingChoice==='fresh'?fresh:base;

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=pool.length+' / '+stock.length+' xe';
  $('stock-tabs').style.display='none';

  aStrip.innerHTML=`
    <button class="aging-tier-card ${agingChoice==='urgent'?'active':''}" data-atier="urgent">
      <strong><span style="color:#c22828">🔴 Tồn kho > 30 ngày</span><small style="color:#7f94af">(Ưu tiên đẩy bán)</small></strong>
      <b style="color:#c22828">${urgent.length} xe</b>
    </button>
    <button class="aging-tier-card ${agingChoice==='mid'?'active':''}" data-atier="mid">
      <strong><span style="color:#b47c0b">🟡 Tồn kho 15 - 30 ngày</span><small style="color:#7f94af">(Đang bán đều)</small></strong>
      <b style="color:#b47c0b">${mid.length} xe</b>
    </button>
    <button class="aging-tier-card ${agingChoice==='fresh'?'active':''}" data-atier="fresh">
      <strong><span style="color:#188a5c">🟢 Xe mới về < 15 ngày</span><small style="color:#7f94af">(Hàng mới/vận tải)</small></strong>
      <b style="color:#188a5c">${fresh.length} xe</b>
    </button>
  `;
  aStrip.querySelectorAll('[data-atier]').forEach(b=>b.onclick=()=>{agingChoice=agingChoice===b.dataset.atier?'':b.dataset.atier;renderStock()});

  aFeed.innerHTML=pool.map(c=>{
    const tier=c.ageDays>=30?'urgent':c.ageDays>=15?'normal':'fresh';
    const tag=c.ageDays>=30?`Tồn kho ${c.ageDays} ngày (Ưu tiên FIFO)`:c.ageDays>=15?`Tồn kho ${c.ageDays} ngày`:`Mới về ${c.ageDays} ngày`;
    return `<article class="aging-row">
      <div>${c.imageInfo?.src?`<img data-live-image src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing">—</div>'}</div>
      <div>
        <span class="aging-pill ${tier}">${tag}</span>
        <div style="margin-top:6px"><button class="aging-vin-btn" data-open-avin="${esc(c.vin)}">${esc(c.vin)}</button></div>
        <div style="font-size:10px;color:#859db7;margin-top:2px">Nhập kho: ${c.received||'2026-10-15'}</div>
      </div>
      <div>
        <strong style="font-size:13px;color:#183253">${esc(c.model)} · ${esc(c.version||'Tiêu chuẩn')}</strong>
        <div style="font-size:11px;color:#607997;margin-top:4px;display:flex;align-items:center;gap:6px">
          <i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')} · Nội thất ${esc(c.interior||'—')} · Kho ${esc(c.location||'—')}
        </div>
      </div>
      <div class="aging-hide-md">
        <span class="status" style="--tone:${tone(c.status)}">${esc(c.status)}</span>
        <div style="font-size:10px;color:#7089a8;margin-top:4px">${c.holder?'Giữ: '+esc(c.holder):'Chưa ghép đơn'}</div>
      </div>
      <div>${actionHTML(c)}</div>
    </article>`;
  }).join('')||'<div class="empty-result">Không có xe trong nhóm tuổi tồn kho này.</div>';

  aFeed.querySelectorAll('[data-open-avin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openAvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions(aFeed);
  bindMore(aFeed);
  enhanceImages(aFeed);
};
document.querySelector('.demo-head p').textContent='Quản lý tuổi tồn kho & ưu tiên chuẩn FIFO · Đẩy nhanh các xe tồn > 30 ngày';
document.querySelector('.demo-footer span').textContent='MẪU 32 · AGING FLEET & FIFO TIMELINE';
'''

write_variant('kho-xe-mau-32.html', 'Kho xe · Mẫu 32 · Tuổi tồn kho và chuẩn FIFO', css_32, js_32)

