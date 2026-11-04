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
# MẪU 34: Executive Asset Accordion (Sổ Cái Phân Dòng Xe Gập/Mở Thông Minh)
# ==============================================================================
css_34 = r'''
.demo-tabs{margin-bottom:12px}
.accordion-controls{display:flex;justify-content:space-between;align-items:center;padding:0 30px 12px}
.accordion-controls strong{font-size:13px;color:#203c5c}
.accordion-feed{flex:1;min-height:0;overflow-y:auto;padding:2px 30px 22px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin}
.acc-row{border:1px solid #dde6f2;border-radius:9px;background:#fff;overflow:hidden;box-shadow:0 2px 8px #152c4805}
.acc-header{display:grid;grid-template-columns:84px 170px minmax(0,1fr) 220px auto;gap:16px;align-items:center;padding:12px 18px;background:#fbfcfe;cursor:pointer;border-bottom:1px solid transparent;user-select:none}
.acc-header:hover{background:#f6f9fe}
.acc-row.open .acc-header{border-bottom-color:#e1e8f2;background:#f5f8fd}
.acc-header img{width:80px;height:48px;object-fit:contain}
.acc-title strong{font-size:15px;color:#183252;display:block}
.acc-title small{font-size:11px;color:#788da8}
.acc-bar-wrap{display:flex;flex-direction:column;gap:4px}
.acc-progress{height:7px;border-radius:999px;background:#eef2f8;display:flex;overflow:hidden}
.acc-seg{height:100%}
.acc-legend{display:flex;gap:12px;font-size:10.5px;color:#738aa7}
.acc-legend b{font-weight:600}
.acc-toggle{font-size:18px;color:#6b84a4;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;border:1px solid #d8e2f0;background:#fff}
.acc-body{display:none;padding:12px 16px;background:#fff}
.acc-row.open .acc-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.acc-card{border:1px solid #e1e9f4;border-radius:7px;padding:10px 12px;background:#fff;display:flex;flex-direction:column;gap:6px}
.acc-card:hover{border-color:#b4cbe8}
.acc-card-top{display:flex;justify-content:space-between;align-items:baseline}
.acc-card-vin{font-family:Consolas,monospace;font-size:12px;color:#20528c;font-weight:600;padding:0;text-align:left}
.acc-card-vin:hover{text-decoration:underline}
@media(max-width:1300px){.acc-row.open .acc-body{grid-template-columns:repeat(2,minmax(0,1fr))}.acc-header{grid-template-columns:70px 140px minmax(0,1fr) auto}}
@media(max-width:980px){.acc-row.open .acc-body{grid-template-columns:1fr}}
'''

js_34 = r'''
let openModels=new Set();
const gall34=$('stock-gallery');
const aCtrl=document.createElement('div');aCtrl.className='accordion-controls';
aCtrl.innerHTML=`
  <strong>Sổ cái xe theo dòng · Bấm vào dòng xe để gập/mở</strong>
  <div style="display:flex;gap:8px">
    <button class="btn" id="acc-expand-all" style="font-size:11px">Mở tất cả</button>
    <button class="btn" id="acc-collapse-all" style="font-size:11px">Thu gọn</button>
  </div>
`;
const aFeed=document.createElement('div');
aFeed.id='variant-workspace';aFeed.className='accordion-feed';
gall34.replaceWith(aCtrl,aFeed);

$('acc-expand-all').onclick=()=>{openModels=new Set(stock.map(c=>c.model));renderStock()};
$('acc-collapse-all').onclick=()=>{openModels.clear();renderStock()};

renderStock=function(){
  closeMore();
  const visible=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=visible.length+' / '+stock.length+' xe';
  const statuses=['',...new Set(['Chưa ghép','Đang giữ','Đã ghép',...stock.map(c=>c.status)])];
  $('stock-tabs').innerHTML=statuses.map(s=>`<button class="${s===statusChoice?'on':''}" data-stock-status="${esc(s)}">${esc(s||'Tất cả xe')}<small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('');
  $('stock-tabs').querySelectorAll('[data-stock-status]').forEach(b=>b.onclick=()=>{statusChoice=b.dataset.stockStatus;renderStock()});

  const models=[...new Set(visible.map(c=>c.model))];
  if(openModels.size===0&&models.length)openModels.add(models[0]);

  aFeed.innerHTML=models.map(m=>{
    const group=visible.filter(c=>c.model===m);
    const hero=group.find(c=>c.imageInfo?.src)||group[0];
    const free=group.filter(c=>c.status==='Chưa ghép').length;
    const hold=group.filter(c=>c.status==='Đang giữ').length;
    const match=group.filter(c=>c.status==='Đã ghép'||(!['Chưa ghép','Đang giữ'].includes(c.status))).length;
    const total=group.length;
    const isOpen=openModels.has(m);

    return `<section class="acc-row ${isOpen?'open':''}" data-acc-model="${esc(m)}">
      <div class="acc-header">
        <div>${hero?.imageInfo?.src?`<img data-live-image src="${esc(hero.imageInfo.src)}" alt="${esc(m)}">`:'<div class="image-missing" style="height:48px;margin:0">—</div>'}</div>
        <div class="acc-title"><strong>${esc(m)}</strong><small>${total} xe trong kho</small></div>
        <div class="acc-bar-wrap">
          <div class="acc-progress">
            <span class="acc-seg" style="width:${(free/total)*100}%;background:#22a774" title="${free} chưa ghép"></span>
            <span class="acc-seg" style="width:${(hold/total)*100}%;background:#edae27" title="${hold} đang giữ"></span>
            <span class="acc-seg" style="width:${(match/total)*100}%;background:#3978d5" title="${match} đã ghép"></span>
          </div>
          <div class="acc-legend">
            <span><b style="color:#1b845c">${free}</b> chưa ghép</span>
            <span><b style="color:#b68213">${hold}</b> đang giữ</span>
            <span><b style="color:#2058a5">${match}</b> đã ghép</span>
          </div>
        </div>
        <div style="font-size:11px;color:#557092">Tồn bãi: ${[...new Set(group.map(c=>c.location).filter(Boolean))].join(', ')||'Thuận An'}</div>
        <div class="acc-toggle">${isOpen?'−':'+'}</div>
      </div>
      <div class="acc-body">
        ${group.map(c=>`<article class="acc-card">
          <div class="acc-card-top">
            <button class="acc-card-vin" data-open-accvin="${esc(c.vin)}">${esc(c.vin)}</button>
            <span class="status" style="--tone:${tone(c.status)};font-size:10px">${esc(c.status)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#6f86a4">
            <span>${esc(c.version||'Tiêu chuẩn')} · <i class="swatch" style="--paint:${c.paint};width:8px;height:8px;margin:0"></i>${esc(c.color||'—')}</span>
            <span>📍 ${esc(c.location||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:6px;border-top:1px solid #f2f5fa">
            <small style="font-size:10px;color:#7891ae">${c.holder?'Giữ: '+esc(c.holder):'Chưa có người giữ'}</small>
            ${actionHTML(c)}
          </div>
        </article>`).join('')}
      </div>
    </section>`;
  }).join('')||'<div class="empty-result">Không có dòng xe nào phù hợp.</div>';

  aFeed.querySelectorAll('.acc-header').forEach(h=>{
    h.onclick=()=>{
      const m=h.closest('.acc-row').dataset.accModel;
      if(openModels.has(m))openModels.delete(m);else openModels.add(m);
      renderStock();
    };
  });

  aFeed.querySelectorAll('[data-open-accvin]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const c=getVIN(b.dataset.openAccvin);
    if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}
  });

  bindActions(aFeed);
  bindMore(aFeed);
  enhanceImages(aFeed);
};
document.querySelector('.demo-head p').textContent='Sổ cái quản lý tài sản xe · Gập/Mở thông minh theo từng dòng xe · Thống kê tỷ lệ màu sắc & trạng thái';
document.querySelector('.demo-footer span').textContent='MẪU 34 · EXECUTIVE ASSET ACCORDION';
'''

write_variant('kho-xe-mau-34.html', 'Kho xe · Mẫu 34 · Sổ cái phân dòng xe gập mở', css_34, js_34)


# ==============================================================================
# MẪU 35: Multi-Dimension Pivot Grid (Bảng Pivot 2 Chiều Bãi Xe × Trạng Thái)
# ==============================================================================
css_35 = r'''
.demo-tabs{margin-bottom:12px}
.pivot-wrap{flex:1;min-height:0;overflow:auto;padding:0 30px 22px;scrollbar-width:thin}
.pivot-table{width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #dde6f2;border-radius:8px;overflow:hidden}
.pivot-table th{position:sticky;top:0;z-index:3;background:#fbfcfe;border:1px solid #dce5f0;padding:12px 14px;font-size:11.5px;color:#24446a;text-align:left}
.pivot-table th:first-child{min-width:160px;z-index:4}
.pivot-table td{border:1px solid #e1eaf4;padding:12px;vertical-align:top;background:#fff}
.pivot-loc-cell{background:#fcfdfe;font-weight:650;font-size:13px;color:#183254}
.pivot-cell-cards{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;scrollbar-width:thin}
.p-mini-card{border:1px solid #e2eaf4;border-radius:6px;padding:8px 10px;background:#fcfdff;display:flex;flex-direction:column;gap:4px}
.p-mini-card:hover{border-color:#b4cbe8;background:#fff}
.p-vin-btn{font-family:Consolas,monospace;font-size:11.5px;color:#20528c;font-weight:600;padding:0;text-align:left}
.p-vin-btn:hover{text-decoration:underline}
'''

js_35 = r'''
const gall35=$('stock-gallery');
const pWrap=document.createElement('div');
pWrap.id='variant-workspace';pWrap.className='pivot-wrap';
pWrap.innerHTML='<table class="pivot-table" id="pivot-table"></table>';
gall35.replaceWith(pWrap);

renderStock=function(){
  closeMore();
  const base=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=base.length+' / '+stock.length+' xe';
  const statuses=['',...new Set(['Chưa ghép','Đang giữ','Đã ghép',...stock.map(c=>c.status)])];
  $('stock-tabs').innerHTML=statuses.map(s=>`<button class="${s===statusChoice?'on':''}" data-stock-status="${esc(s)}">${esc(s||'Tất cả xe')}<small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('');
  $('stock-tabs').querySelectorAll('[data-stock-status]').forEach(b=>b.onclick=()=>{statusChoice=b.dataset.stockStatus;renderStock()});

  const locations=[...new Set(base.map(c=>c.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const states=['Chưa ghép','Đang giữ','Đã ghép'];

  $('pivot-table').innerHTML=`
    <thead><tr>
      <th>Bãi xe \\ Trạng thái</th>
      <th><i class="mini-dot" style="--tone:#22a774"></i>Sẵn sàng ghép (${base.filter(c=>c.status==='Chưa ghép').length})</th>
      <th><i class="mini-dot" style="--tone:#edae27"></i>Đang trong hạn giữ (${base.filter(c=>c.status==='Đang giữ').length})</th>
      <th><i class="mini-dot" style="--tone:#3978d5"></i>Đã ghép hợp đồng (${base.filter(c=>c.status==='Đã ghép').length})</th>
    </tr></thead>
    <tbody>
      ${locations.map(loc=>{
        const locCars=base.filter(c=>c.location===loc);
        return `<tr>
          <td class="pivot-loc-cell">
            <div>📍 ${esc(loc)}</div>
            <small style="font-size:10px;color:#7e93af;font-weight:400">${locCars.length} xe</small>
          </td>
          ${states.map(st=>{
            const cellCars=locCars.filter(c=>st==='Đã ghép'?(c.status==='Đã ghép'||(!['Chưa ghép','Đang giữ'].includes(c.status))):c.status===st);
            return `<td>
              <div class="pivot-cell-cards">
                ${cellCars.map(c=>`<div class="p-mini-card">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <button class="p-vin-btn" data-open-pvin="${esc(c.vin)}">${esc(c.vin)}</button>
                    <span style="font-size:10.5px;color:#183252;font-weight:600">${esc(c.model)}</span>
                  </div>
                  <div style="font-size:10px;color:#7187a4;display:flex;justify-content:space-between">
                    <span>${esc(c.version||'Tiêu chuẩn')} · <i class="swatch" style="--paint:${c.paint};width:8px;height:8px;margin:0"></i>${esc(c.color||'—')}</span>
                    <span>${c.holder?'Giữ: '+esc(c.holder):'Kho trống'}</span>
                  </div>
                  <div style="display:flex;justify-content:flex-end;margin-top:2px">${actionHTML(c)}</div>
                </div>`).join('')||'<span style="color:#b2c1d4;font-size:11px">Không có xe</span>'}
              </div>
            </td>`;
          }).join('')}
        </tr>`;
      }).join('')}
    </tbody>
  `;

  pWrap.querySelectorAll('[data-open-pvin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openPvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions(pWrap);
  bindMore(pWrap);
};
document.querySelector('.demo-head p').textContent='Bảng Pivot 2 chiều (Bãi xe × Trạng thái) · Tra cứu xe sẵn sàng theo từng địa điểm showroom';
document.querySelector('.demo-footer span').textContent='MẪU 35 · MULTI-DIMENSION PIVOT GRID';
'''

write_variant('kho-xe-mau-35.html', 'Kho xe · Mẫu 35 · Bảng Pivot bãi xe và trạng thái', css_35, js_35)


# ==============================================================================
# MẪU 36: Smart Faceted Command Center (Lọc Tổ Hợp Bên Trái + Dòng Thẻ Xe Lớn)
# ==============================================================================
css_36 = r'''
.demo-tabs{display:none}
.demo-toolbar{display:none}
.cmd-layout{flex:1;min-height:0;display:grid;grid-template-columns:280px minmax(0,1fr);border-top:1px solid var(--line);background:#fafcff}
.cmd-sidebar{border-right:1px solid var(--line);background:#fff;padding:16px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;scrollbar-width:thin}
.facet-group strong{display:block;font-size:11px;color:#7e93af;text-transform:uppercase;letter-spacing:.3px;margin-bottom:8px}
.facet-btn-list{display:flex;flex-direction:column;gap:4px}
.facet-item{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:6px;border:1px solid transparent;font-size:11.5px;color:#354f73;background:#f8fafd;cursor:pointer;text-align:left}
.facet-item:hover{background:#edf4fe;color:#1e4f94}
.facet-item.active{background:#edf4fe;border-color:#205eb4;color:#1b4f99;font-weight:600}
.facet-item small{font-size:10px;color:#8ba0ba}
.cmd-stream{flex:1;min-height:0;overflow-y:auto;padding:16px 24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;scrollbar-width:thin}
.cmd-card{border:1px solid #dde6f2;border-radius:9px;background:#fff;padding:14px 16px;display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;box-shadow:0 3px 12px #18305006}
.cmd-card:hover{border-color:#b4cbe8}
.cmd-card img{width:120px;height:76px;object-fit:contain}
.cmd-card-content{display:flex;flex-direction:column;gap:5px;min-width:0}
.cmd-card-vin{font-family:Consolas,monospace;font-size:12.5px;color:#20528c;font-weight:600;padding:0;text-align:left}
.cmd-card-vin:hover{text-decoration:underline}
@media(max-width:1300px){.cmd-stream{grid-template-columns:1fr}}
'''

js_36 = r'''
let fModel='',fStatus='',fLoc='';
const gall36=$('stock-gallery');
const cmdBox=document.createElement('div');
cmdBox.id='variant-workspace';cmdBox.className='cmd-layout';
cmdBox.innerHTML=`
  <aside class="cmd-sidebar" id="cmd-sidebar"></aside>
  <main class="cmd-stream" id="cmd-stream"></main>
`;
gall36.replaceWith(cmdBox);

renderStock=function(){
  closeMore();
  const base=stock.filter(c=>{
    const matchM=!fModel||c.model===fModel;
    const matchS=!fStatus||(fStatus==='Đã ghép'?(c.status==='Đã ghép'||(!['Chưa ghép','Đang giữ'].includes(c.status))):c.status===fStatus);
    const matchL=!fLoc||c.location===fLoc;
    return matchM&&matchS&&matchL;
  });

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=base.length+' / '+stock.length+' xe';

  const models=['',...new Set(stock.map(c=>c.model))].sort();
  const statuses=['', 'Chưa ghép', 'Đang giữ', 'Đã ghép'];
  const locations=['',...new Set(stock.map(c=>c.location).filter(Boolean))].sort();

  $('cmd-sidebar').innerHTML=`
    <div class="facet-group">
      <strong>Trạng thái ghép xe</strong>
      <div class="facet-btn-list">${statuses.map(s=>`<button class="facet-item ${fStatus===s?'active':''}" data-fs="${esc(s)}"><span>${esc(s||'Tất cả trạng thái')}</span><small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('')}</div>
    </div>
    <div class="facet-group">
      <strong>Dòng xe VinFast</strong>
      <div class="facet-btn-list">${models.map(m=>`<button class="facet-item ${fModel===m?'active':''}" data-fm="${esc(m)}"><span>${esc(m||'Tất cả dòng xe')}</span><small>${m?stock.filter(c=>c.model===m).length:stock.length}</small></button>`).join('')}</div>
    </div>
    <div class="facet-group">
      <strong>Vị trí kho bãi</strong>
      <div class="facet-btn-list">${locations.map(l=>`<button class="facet-item ${fLoc===l?'active':''}" data-fl="${esc(l)}"><span>📍 ${esc(l||'Tất cả kho')}</span><small>${l?stock.filter(c=>c.location===l).length:stock.length}</small></button>`).join('')}</div>
    </div>
    <button class="btn" id="clear-all-facets" style="margin-top:auto;font-size:11px">Xóa toàn bộ bộ lọc</button>
  `;

  $('cmd-sidebar').querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>{fStatus=b.dataset.fs;renderStock()});
  $('cmd-sidebar').querySelectorAll('[data-fm]').forEach(b=>b.onclick=()=>{fModel=b.dataset.fm;renderStock()});
  $('cmd-sidebar').querySelectorAll('[data-fl]').forEach(b=>b.onclick=()=>{fLoc=b.dataset.fl;renderStock()});
  $('clear-all-facets').onclick=()=>{fStatus='';fModel='';fLoc='';renderStock()};

  $('cmd-stream').innerHTML=base.map(c=>`<article class="cmd-card">
    <div>${c.imageInfo?.src?`<img data-live-image src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing" style="height:76px;margin:0">—</div>'}</div>
    <div class="cmd-card-content">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <strong style="font-size:14px;color:#183253">${esc(c.model)} <small style="font-weight:400;color:#788ea9">${esc(c.version||'Tiêu chuẩn')}</small></strong>
        <span class="status" style="--tone:${tone(c.status)};font-size:10px">${esc(c.status)}</span>
      </div>
      <div><button class="cmd-card-vin" data-open-cmdvin="${esc(c.vin)}">${esc(c.vin)}</button></div>
      <div style="font-size:11px;color:#617a99;display:flex;gap:8px;align-items:center">
        <span><i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')}</span>
        <span>📍 ${esc(c.location||'—')}</span>
      </div>
      <div style="font-size:10px;color:#859db7">DMS: ${esc(c.dms||'—')} · Máy: ${esc(c.engine||'—')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px solid #f2f5fa">
        <small style="font-size:10px;color:#6b84a3">${c.holder?'Giữ: '+esc(c.holder):'Chưa có người giữ'}</small>
        ${actionHTML(c)}
      </div>
    </div>
  </article>`).join('')||'<div class="empty-result">Không tìm thấy xe phù hợp tổ hợp bộ lọc đã chọn.</div>';

  $('cmd-stream').querySelectorAll('[data-open-cmdvin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openCmdvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions($('cmd-stream'));
  bindMore($('cmd-stream'));
  enhanceImages($('cmd-stream'));
};
document.querySelector('.demo-head p').textContent='Bộ điều khiển tác nghiệp TVBH · Lọc tổ hợp tức thì bên trái · Dòng chảy xe tác nghiệp bên phải';
document.querySelector('.demo-footer span').textContent='MẪU 36 · SMART FACETED COMMAND CENTER';
'''

write_variant('kho-xe-mau-36.html', 'Kho xe · Mẫu 36 · Trung tâm lọc tác nghiệp TVBH', css_36, js_36)


# ==============================================================================
# MẪU 37: Studio 3D Carousel & Showcase Deck (Băng Chuyền Studio 3D & Hàng Đợi VIN)
# ==============================================================================
css_37 = r'''
.demo-tabs{display:none}
.studio-layout{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--line);background:#fafcff}
.studio-stage{background:linear-gradient(180deg,#fff 0%,#f1f5fa 100%);padding:16px 30px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:320px minmax(0,1fr) 260px;gap:20px;align-items:center}
.studio-stage-img{width:100%;height:150px;object-fit:contain}
.studio-thumbs{display:flex;gap:8px;padding:0 30px 12px;overflow-x:auto;scrollbar-width:thin;background:#fff;border-bottom:1px solid var(--line)}
.s-thumb{display:flex;align-items:center;gap:6px;border:1px solid #dde5f0;border-radius:6px;padding:5px 10px;background:#fff;font-size:11px;color:#456084;white-space:nowrap;cursor:pointer}
.s-thumb:hover{border-color:#a1bede}
.s-thumb.active{border-color:#205eb4;background:#edf4fe;color:#1e4f94;font-weight:600}
.s-thumb img{width:40px;height:24px;object-fit:contain}
.studio-vins-feed{flex:1;min-height:0;overflow-y:auto;padding:14px 30px 22px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;scrollbar-width:thin}
.s-vincard{border:1px solid #dde6f2;border-radius:8px;background:#fff;padding:11px 14px;display:flex;flex-direction:column;gap:6px}
.s-vincard:hover{border-color:#b4cbe8}
.s-vin-btn{font-family:Consolas,monospace;font-size:12px;color:#20528c;font-weight:600;padding:0;text-align:left}
.s-vin-btn:hover{text-decoration:underline}
@media(max-width:1300px){.studio-stage{grid-template-columns:1fr 1fr;gap:14px}.studio-stage-extra{display:none}.studio-vins-feed{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''

js_37 = r'''
let studioModel='';
const gall37=$('stock-gallery');
const sLayout=document.createElement('div');
sLayout.id='variant-workspace';sLayout.className='studio-layout';
sLayout.innerHTML=`
  <div class="studio-thumbs" id="studio-thumbs"></div>
  <div class="studio-stage" id="studio-stage"></div>
  <div class="studio-vins-feed" id="studio-vins-feed"></div>
`;
gall37.replaceWith(sLayout);

renderStock=function(){
  closeMore();
  const base=filteredStock();
  const models=[...new Set(base.map(c=>c.model))].sort();
  if(!studioModel||!models.includes(studioModel))studioModel=models[0]||'';

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=base.length+' / '+stock.length+' xe';

  $('studio-thumbs').innerHTML=models.map(m=>{
    const g=base.filter(c=>c.model===m);
    const hero=g.find(c=>c.imageInfo?.src)||g[0];
    return `<button class="s-thumb ${studioModel===m?'active':''}" data-sm="${esc(m)}">
      ${hero?.imageInfo?.src?`<img data-live-image src="${esc(hero.imageInfo.src)}" alt="${esc(m)}">`:''}
      <span>${esc(m)} (${g.length})</span>
    </button>`;
  }).join('');
  $('studio-thumbs').querySelectorAll('[data-sm]').forEach(b=>b.onclick=()=>{studioModel=b.dataset.sm;renderStock()});

  const curGroup=base.filter(c=>c.model===studioModel);
  const curHero=curGroup.find(c=>c.imageInfo?.src)||curGroup[0];
  const freeCount=curGroup.filter(c=>c.status==='Chưa ghép').length;

  $('studio-stage').innerHTML=`
    <div>
      <h2 style="font-size:24px;color:#183253;margin:0">${esc(studioModel)}</h2>
      <p style="font-size:12px;color:#788ea9;margin:6px 0 0">${curGroup.length} xe trong kho · <b style="color:#1b845c">${freeCount} xe sẵn sàng giao</b></p>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${[...new Set(curGroup.map(c=>c.color))].map(col=>`<span style="font-size:10px;color:#557092;background:#fff;border:1px solid #dde5f0;padding:3px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:4px"><i class="swatch" style="--paint:${paintHex(col)};width:8px;height:8px;margin:0"></i>${esc(col)}</span>`).join('')}
      </div>
    </div>
    <div style="display:grid;place-items:center">
      ${curHero?.imageInfo?.src?`<img data-live-image class="studio-stage-img" src="${esc(curHero.imageInfo.src)}" alt="${esc(studioModel)}">`:'<div class="image-missing" style="height:150px;width:100%">—</div>'}
    </div>
    <div class="studio-stage-extra" style="border-left:1px solid #dce5f0;padding-left:16px;font-size:11px;color:#607997;display:flex;flex-direction:column;gap:5px">
      <div><b>Kho bãi:</b> ${[...new Set(curGroup.map(c=>c.location).filter(Boolean))].join(', ')||'Thuận An'}</div>
      <div><b>Phiên bản:</b> ${[...new Set(curGroup.map(c=>c.version).filter(Boolean))].join(', ')||'Tiêu chuẩn'}</div>
      <button class="btn primary" id="open-studio-all-vins" style="margin-top:8px;font-size:11px">Xem toàn bộ ${curGroup.length} VIN →</button>
    </div>
  `;
  if($('open-studio-all-vins'))$('open-studio-all-vins').onclick=()=>openDrawer(studioModel,'',true);

  $('studio-vins-feed').innerHTML=curGroup.map(c=>`<article class="s-vincard">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <button class="s-vin-btn" data-open-svin="${esc(c.vin)}">${esc(c.vin)}</button>
      <span class="status" style="--tone:${tone(c.status)};font-size:10px">${esc(c.status)}</span>
    </div>
    <div style="font-size:11px;color:#557092;display:flex;justify-content:space-between">
      <span>${esc(c.version||'Tiêu chuẩn')} · <i class="swatch" style="--paint:${c.paint};width:8px;height:8px;margin:0"></i>${esc(c.color||'—')}</span>
      <span>📍 ${esc(c.location||'—')}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:6px;border-top:1px solid #f2f5fa">
      <small style="font-size:10px;color:#7891ad">${c.holder?'Giữ: '+esc(c.holder):'Sẵn sàng giao'}</small>
      ${actionHTML(c)}
    </div>
  </article>`).join('')||'<div class="empty-result">Không có xe trong dòng này.</div>';

  $('studio-vins-feed').querySelectorAll('[data-open-svin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openSvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions($('studio-vins-feed'));
  bindMore($('studio-vins-feed'));
  enhanceImages(sLayout);
};
document.querySelector('.demo-head p').textContent='Phòng trưng bày xe Studio 3D · Băng chuyền dòng xe cao cấp · Hàng đợi giao ngay theo chuẩn FIFO';
document.querySelector('.demo-footer span').textContent='MẪU 37 · STUDIO 3D CAROUSEL & SHOWCASE DECK';
'''

write_variant('kho-xe-mau-37.html', 'Kho xe · Mẫu 37 · Băng chuyền Studio 3D', css_37, js_37)


# ==============================================================================
# MẪU 38: Stock Audit & Rapid Reconciliation Table (Bảng Kiểm Kê & Đối Soát Bãi)
# ==============================================================================
css_38 = r'''
.demo-tabs{margin-bottom:12px}
.audit-stats-bar{display:flex;justify-content:space-between;align-items:center;padding:0 30px 12px;gap:12px;flex-wrap:wrap}
.audit-progress-card{border:1px solid #dde5f0;border-radius:8px;padding:8px 14px;background:#fff;display:flex;align-items:center;gap:12px}
.audit-progress-card strong{font-size:14px;color:#183253}
.audit-search-fast{display:flex;align-items:center;gap:8px;border:1px solid #205eb4;border-radius:6px;padding:6px 12px;background:#fff}
.audit-search-fast input{border:0;outline:0;font-size:12px;color:#183253;width:240px}
.audit-table-wrap{flex:1;min-height:0;overflow:auto;padding:0 30px 22px;scrollbar-width:thin}
.audit-table{width:100%;border-collapse:collapse;font-size:11.5px;background:#fff;border:1px solid #dde6f2;border-radius:8px;overflow:hidden}
.audit-table th{position:sticky;top:0;z-index:2;background:#fbfcfe;border-bottom:1px solid #dce5f0;padding:10px 12px;font-size:10.5px;color:#557092;text-align:left;white-space:nowrap}
.audit-table td{border-bottom:1px solid #eef2f8;padding:9px 12px;vertical-align:middle}
.audit-table tr.checked-row{background:#f6fcf8}
.audit-table tr.highlighted{background:#fff9e6}
.audit-check-btn{width:22px;height:22px;border-radius:50%;border:1px solid #c5d4e6;background:#fff;cursor:pointer;display:grid;place-items:center;font-size:12px;color:#22a774}
.audit-check-btn.checked{background:#22a774;border-color:#22a774;color:#fff}
.audit-vin-link{font-family:Consolas,monospace;font-size:12px;color:#20528c;font-weight:600;padding:0;text-align:left}
.audit-vin-link:hover{text-decoration:underline}
'''

js_38 = r'''
let checkedVINs=new Set(),auditFastQuery='';
const gall38=$('stock-gallery');
const aBar=document.createElement('div');aBar.className='audit-stats-bar';
aBar.innerHTML=`
  <div class="audit-progress-card">
    <span style="font-size:11px;color:#788ea9">Tiến độ đối soát bãi xe:</span>
    <strong id="audit-checked-count">0 / 0 xe</strong>
    <button class="btn" id="audit-reset-checks" style="padding:4px 8px;font-size:10px">Đặt lại tích</button>
  </div>
  <div class="audit-search-fast">
    ${icon('search')}
    <input id="audit-fast-input" placeholder="Gõ 4 số cuối VIN hoặc mã máy để nhảy đến xe…" aria-label="Tìm nhanh VIN">
  </div>
`;
const aWrap=document.createElement('div');
aWrap.id='variant-workspace';aWrap.className='audit-table-wrap';
aWrap.innerHTML='<table class="audit-table" id="audit-table"></table>';
gall38.replaceWith(aBar,aWrap);

$('audit-fast-input').oninput=e=>{auditFastQuery=e.target.value.trim().toLowerCase();renderStock()};
$('audit-reset-checks').onclick=()=>{checkedVINs.clear();renderStock()};

renderStock=function(){
  closeMore();
  const base=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=base.length+' / '+stock.length+' xe';
  $('audit-checked-count').textContent=`${checkedVINs.size} / ${stock.length} xe`;

  const sorted=[...base].sort((a,b)=>{
    if(auditFastQuery){
      const aHit=a.vin.toLowerCase().includes(auditFastQuery);
      const bHit=b.vin.toLowerCase().includes(auditFastQuery);
      if(aHit&&!bHit)return -1;
      if(!aHit&&bHit)return 1;
    }
    return 0;
  });

  $('audit-table').innerHTML=`
    <thead><tr>
      <th style="width:40px">Đã soát</th>
      <th>Dòng xe / Phiên bản</th>
      <th>Số VIN (17 ký tự)</th>
      <th>Mã DMS / Số máy</th>
      <th>Màu ngoại thất / Nội thất</th>
      <th>Vị trí bãi đỗ</th>
      <th>Ngày nhập</th>
      <th>Trạng thái</th>
      <th>Thao tác</th>
    </tr></thead>
    <tbody>${sorted.map((c,idx)=>{
      const isChecked=checkedVINs.has(c.vin);
      const isHighlight=auditFastQuery&&c.vin.toLowerCase().includes(auditFastQuery);
      return `<tr class="${isChecked?'checked-row':''} ${isHighlight?'highlighted':''}">
        <td><button class="audit-check-btn ${isChecked?'checked':''}" data-audit-vin="${esc(c.vin)}" title="Đánh dấu đã kiểm tra thực tế">${isChecked?'✓':''}</button></td>
        <td><strong>${esc(c.model)}</strong> <small style="color:#7f94af">${esc(c.version||'Tiêu chuẩn')}</small></td>
        <td><button class="audit-vin-link" data-open-audvin="${esc(c.vin)}">${esc(c.vin)}</button></td>
        <td><span style="font-family:Consolas,monospace;color:#456082">${esc(c.dms||'—')}</span> <small style="color:#8a9fb7">Máy: ${esc(c.engine||'—')}</small></td>
        <td><span style="display:flex;align-items:center;gap:5px"><i class="swatch" style="--paint:${c.paint};width:8px;height:8px;margin:0"></i>${esc(c.color||'—')}</span></td>
        <td>📍 ${esc(c.location||'—')}</td>
        <td>${c.received||'—'}</td>
        <td><span class="status" style="--tone:${tone(c.status)};font-size:10px">${esc(c.status)}</span></td>
        <td>${actionHTML(c)}</td>
      </tr>`;
    }).join('')}</tbody>
  `;

  $('audit-table').querySelectorAll('[data-audit-vin]').forEach(b=>b.onclick=()=>{
    const v=b.dataset.auditVin;
    if(checkedVINs.has(v))checkedVINs.delete(v);else checkedVINs.add(v);
    renderStock();
  });

  $('audit-table').querySelectorAll('[data-open-audvin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openAudvin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions($('audit-table'));
  bindMore($('audit-table'));
};
document.querySelector('.demo-head p').textContent='Bảng đối soát bãi xe & kiểm kê vật lý · Tìm nhanh 4 số cuối VIN · Đánh dấu xe đã kiểm đếm';
document.querySelector('.demo-footer span').textContent='MẪU 38 · STOCK AUDIT & RAPID RECONCILIATION';
'''

write_variant('kho-xe-mau-38.html', 'Kho xe · Mẫu 38 · Bảng kiểm kê đối soát bãi xe', css_38, js_38)

