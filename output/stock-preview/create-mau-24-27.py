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
# MẪU 24: Showroom Configurator (1 Thẻ / Dòng Xe + Chọn Màu Trực Tiếp Trên Thẻ)
# ==============================================================================
css_24 = r'''
.demo-gallery{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;padding:2px 30px 24px}
.config-card{border:1px solid #dfe7f2;border-radius:9px;background:#fff;padding:18px 20px 16px;display:flex;flex-direction:column;min-width:0;transition:border-color .15s,box-shadow .15s}
.config-card:hover{border-color:#b8cce6;box-shadow:0 8px 24px #162b490c}
.config-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.config-top h2{font-size:23px;font-weight:650;margin:0;letter-spacing:-.4px}
.config-top small{color:#7f93ae;font-size:11px;white-space:nowrap}
.config-stage{width:100%;padding:0;margin:8px 0 6px;display:block;border-radius:7px;background:linear-gradient(180deg,#fafcff 0%,#f3f7fc 100%);height:136px;display:grid;place-items:center;overflow:hidden}
.config-stage img{width:100%;height:122px;object-fit:contain;display:block}
.config-stage .image-missing{margin:0;height:122px;width:100%;background:transparent}
.swatch-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0 7px;min-height:28px}
.swatch-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #dde5f0;border-radius:999px;padding:4px 8px 4px 6px;font-size:10px;color:#5b7290;background:#fff}
.swatch-chip:hover{border-color:#9eb8dc;background:#f7faff}
.swatch-chip.active{border-color:#205eb4;background:#edf4fe;color:#1b4f99;font-weight:600}
.swatch-chip.all-chip{padding:4px 9px}
.swatch-dot{width:11px;height:11px;border-radius:50%;background:var(--paint,#f5f7fa);border:1px solid #bfcce0;flex-shrink:0}
.active-color-name{font-size:11px;color:#516987;padding-bottom:12px;min-height:27px;display:flex;justify-content:space-between;gap:8px;align-items:center}
.active-color-name em{font-style:normal;color:#8ba0bb;font-size:10px;white-space:nowrap}
.config-actions{display:flex;gap:8px;margin-top:auto}
.config-actions .group-select{flex:1}
.config-actions .btn-all{border:1px solid #dde6f2;border-radius:5px;padding:10px 11px;font-size:11px;color:#556e8e;background:#fff;white-space:nowrap}
.config-actions .btn-all:hover{background:#f3f7fd;color:#205eb4}
@media(max-width:1280px){.demo-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''

js_24 = r'''
let activeSwatchByModel={};
function onLiveReset(){activeSwatchByModel={}}
renderStock=function(){
  const visible=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=visible.length+' / '+stock.length+' xe';
  const statuses=['',...new Set(['Chưa ghép','Đang giữ','Đã ghép',...stock.map(c=>c.status)])];
  $('stock-tabs').innerHTML=statuses.map(s=>`<button class="${s===statusChoice?'on':''}" data-stock-status="${esc(s)}">${esc(s||'Tất cả xe')}<small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('');
  const models=[...new Set(visible.map(c=>c.model))];
  $('stock-gallery').innerHTML=models.map(model=>{
    const modelCars=visible.filter(c=>c.model===model);
    const combos=[...new Set(modelCars.map(liveKey))];
    let chosenKey=activeSwatchByModel[model];
    if(chosenKey&&chosenKey!=='ALL'&&!combos.includes(chosenKey))chosenKey='';
    if(!chosenKey){
      const availCombo=combos.find(k=>modelCars.some(c=>liveKey(c)===k&&c.status==='Chưa ghép'));
      chosenKey=availCombo||combos[0];
      activeSwatchByModel[model]=chosenKey;
    }
    const scoped=chosenKey==='ALL'?modelCars:modelCars.filter(c=>liveKey(c)===chosenKey);
    const heroCar=scoped.find(c=>c.imageInfo?.src)||modelCars.find(c=>c.imageInfo?.src)||scoped[0]||modelCars[0];
    const sample=scoped[0]||modelCars[0];
    return `<section class="config-card" data-model-card="${esc(model)}">
      <div class="config-top"><h2>${esc(model)}</h2><small>${modelCars.length} xe · ${combos.length} phối màu</small></div>
      <button class="config-stage" data-open-scoped="${esc(model)}" aria-label="Mở danh sách xe ${esc(model)}">
        ${heroCar?.imageInfo?.src?`<img data-live-image src="${esc(heroCar.imageInfo.src)}" alt="${esc(model)}">`:'<div class="image-missing">Chưa có ảnh đúng cấu hình</div>'}
      </button>
      <div class="swatch-bar" role="group" aria-label="Chọn màu ${esc(model)}">
        ${combos.length>1?`<button type="button" class="swatch-chip all-chip ${chosenKey==='ALL'?'active':''}" data-pick-model="${esc(model)}" data-pick-key="ALL">Tất cả (${modelCars.length})</button>`:''}
        ${combos.map(k=>{const g=modelCars.filter(c=>liveKey(c)===k);const first=g[0];return `<button type="button" class="swatch-chip ${chosenKey===k?'active':''}" data-pick-model="${esc(model)}" data-pick-key="${esc(k)}" title="${esc((first.color||'—')+' / '+(first.interior||'—'))}"><i class="swatch-dot" style="--paint:${first.paint}"></i><span>${g.length}</span></button>`}).join('')}
      </div>
      <div class="active-color-name">
        <span>${chosenKey==='ALL'?'Tất cả '+combos.length+' phối màu':esc((sample.color||'—')+' / '+(sample.interior||'—'))}</span>
        <em>${scoped.filter(c=>c.status==='Chưa ghép').length} chưa ghép</em>
      </div>
      <div class="group-stats">${[['Chưa ghép','#23a572'],['Đang giữ','#e9ad29'],['Đã ghép','#3779cc']].map(([s,t])=>`<div class="group-stat"><strong>${scoped.filter(c=>c.status===s).length}</strong><span><i class="mini-dot" style="--tone:${t}"></i>${s}</span></div>`).join('')}</div>
      <div class="config-actions">
        <button class="group-select" data-open-scoped="${esc(model)}"><span>${chosenKey==='ALL'?'Chọn xe · '+modelCars.length+' VIN':'Chọn màu này · '+scoped.length+' VIN'}</span><span>→</span></button>
        ${combos.length>1&&chosenKey!=='ALL'?`<button class="btn-all" data-open-all="${esc(model)}">Cả dòng (${modelCars.length})</button>`:''}
      </div>
    </section>`;
  }).join('')||'<div class="empty-result">'+(loadingLive?'Đang tải dữ liệu kho thật…':'Không có xe phù hợp bộ lọc hiện tại.')+'</div>';
  $('stock-tabs').querySelectorAll('[data-stock-status]').forEach(b=>b.onclick=()=>{statusChoice=b.dataset.stockStatus;renderStock()});
  $('stock-gallery').querySelectorAll('[data-pick-key]').forEach(b=>b.onclick=()=>{activeSwatchByModel[b.dataset.pickModel]=b.dataset.pickKey;renderStock()});
  $('stock-gallery').querySelectorAll('[data-open-scoped]').forEach(b=>b.onclick=()=>{const m=b.dataset.openScoped;const k=activeSwatchByModel[m];liveGroupKey=(!k||k==='ALL')?'':k;openDrawer(m,'',true)});
  $('stock-gallery').querySelectorAll('[data-open-all]').forEach(b=>b.onclick=()=>{liveGroupKey='';openDrawer(b.dataset.openAll,'',true)});
  enhanceImages($('stock-gallery'));
};
document.querySelector('.demo-head p').textContent='Gom gọn 1 thẻ mỗi dòng xe · Bấm chấm màu đổi ảnh trực tiếp trên thẻ · Thao tác chỉ mô phỏng';
document.querySelector('.demo-footer span').textContent='MẪU 24 · CONFIGURATOR ĐỔI MÀU TRỰC TIẾP TRÊN THẺ DÒNG XE';
'''

write_variant('kho-xe-mau-24.html', 'Kho xe · Mẫu 24 · Đổi màu trên thẻ dòng xe', css_24, js_24)


# ==============================================================================
# MẪU 25: Tri-Column Split Cockpit (Nhóm Xe | Danh Sách VIN | Hộ Chiếu VIN)
# ==============================================================================
css_25 = r'''
.demo-tabs{margin-bottom:14px}
.cockpit-shell{flex:1;min-height:0;display:grid;grid-template-columns:288px minmax(365px,36%) minmax(0,1fr);border-top:1px solid var(--line);background:#fff}
.cockpit-col{min-height:0;display:flex;flex-direction:column;border-right:1px solid var(--line);min-width:0}
.cockpit-col:last-child{border-right:0}
.col-head{padding:12px 18px;border-bottom:1px solid var(--line);background:#fbfcfe;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:48px;flex-shrink:0}
.col-head strong{font-size:12px;color:#334e73;font-weight:600}
.col-head small{font-size:11px;color:#899db8}
.col-head select{border:1px solid #dbe4f0;border-radius:5px;padding:6px 8px;font-size:11px;color:#516a8b;background:#fff;max-width:170px}
.col-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin}
.group-item{width:100%;display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid #eef2f8;text-align:left}
.group-item:hover{background:#f6f9fe}
.group-item.active{background:#edf4fe;box-shadow:inset 3px 0 #205eb4}
.group-thumb{width:64px;height:40px;display:grid;place-items:center;background:#f8fafd;border-radius:5px;overflow:hidden}
.group-thumb img{width:60px;height:36px;object-fit:contain}
.group-thumb .image-missing{height:36px;width:60px;margin:0;font-size:9px}
.group-meta strong{display:block;font-size:13px;color:#1e3554}
.group-meta span{display:flex;align-items:center;gap:5px;font-size:10px;color:#7f93ae;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.group-badge{text-align:right;font-size:10px;color:#869ab5}
.group-badge b{display:block;font-size:12px;color:#229a6b;font-weight:600}
.cockpit-vin{padding:13px 16px;border-bottom:1px solid #eef2f8;cursor:pointer;display:flex;flex-direction:column;gap:8px}
.cockpit-vin:hover{background:#f7faff}
.cockpit-vin.active{background:#edf4fe;box-shadow:inset 3px 0 #205eb4}
.cockpit-vin-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cockpit-vin-code{font-family:Consolas,monospace;font-size:12px;color:#244c80;font-weight:600}
.cockpit-vin-mid{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;color:#788da9}
.cockpit-vin-bot{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cockpit-vin-holder{font-size:10px;color:#607999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cockpit-vin .row-actions .btn{padding:6px 10px;font-size:10px}
.cockpit-vin .row-actions .primary{min-width:96px}
.cockpit-vin .more-button{height:28px;min-width:28px;font-size:18px}
#cockpit-detail{padding:18px 24px;overflow-y:auto;flex:1;min-height:0}
@media(max-width:1420px){
  .cockpit-shell{grid-template-columns:245px 340px minmax(0,1fr)}
  .group-item{grid-template-columns:52px minmax(0,1fr) auto;padding:10px 12px}
  .group-thumb{width:52px;height:34px}.group-thumb img{width:48px;height:30px}
  #cockpit-detail{padding:16px 18px}
}
@media(max-width:1080px){
  .cockpit-shell{grid-template-columns:220px minmax(0,1fr)}
  .cockpit-col:nth-child(3){display:none}
}
'''

js_25 = r'''
let cockpitGroup='ALL',cockpitVersion='';
const galleryEl=$('stock-gallery');
const cockpitShell=document.createElement('div');
cockpitShell.id='variant-workspace';
cockpitShell.className='cockpit-shell';
cockpitShell.innerHTML=`
  <section class="cockpit-col" aria-label="Nhóm dòng xe và màu">
    <div class="col-head"><strong>1 · Dòng xe & Phối màu</strong><small id="cg-count"></small></div>
    <div class="col-scroll" id="cockpit-groups"></div>
  </section>
  <section class="cockpit-col" aria-label="Danh sách số VIN">
    <div class="col-head"><div><strong id="cv-title">2 · Danh sách VIN</strong> <small id="cv-count"></small></div><select id="cockpit-version" aria-label="Lọc phiên bản"><option value="">Tất cả phiên bản</option></select></div>
    <div class="col-scroll" id="cockpit-vins"></div>
  </section>
  <section class="cockpit-col" aria-label="Chi tiết hộ chiếu xe">
    <div class="col-head"><strong>3 · Hộ chiếu & Tác nghiệp VIN</strong><small id="cd-vin"></small></div>
    <div id="cockpit-detail"></div>
  </section>`;
galleryEl.replaceWith(cockpitShell);

function onLiveReset(){cockpitGroup='ALL';cockpitVersion=''}
function onLiveLoaded(){selectedVIN=stock[0]?.vin||''}

function renderCockpitDetail(){
  const host=$('cockpit-detail');
  if(!selectedVIN||!getVIN(selectedVIN)){
    host.innerHTML='<div class="empty-result">Chọn một VIN ở cột giữa để xem đầy đủ 18 trường thông tin xe.</div>';
    $('cd-vin').textContent='—';
    return;
  }
  $('cd-vin').textContent=selectedVIN;
  const drawerDetail=$('vin-detail');
  const tempId=drawerDetail.id;
  drawerDetail.id='vin-detail-drawer-backup';
  host.id='vin-detail';
  renderDetail();
  host.id='cockpit-detail';
  drawerDetail.id=tempId;
}

renderStock=function(){
  closeMore();
  const visible=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=visible.length+' / '+stock.length+' xe';
  const statuses=['',...new Set(['Chưa ghép','Đang giữ','Đã ghép',...stock.map(c=>c.status)])];
  $('stock-tabs').innerHTML=statuses.map(s=>`<button class="${s===statusChoice?'on':''}" data-stock-status="${esc(s)}">${esc(s||'Tất cả xe')}<small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('');
  $('stock-tabs').querySelectorAll('[data-stock-status]').forEach(b=>b.onclick=()=>{statusChoice=b.dataset.stockStatus;renderStock()});

  if(loadingLive){
    $('cockpit-groups').innerHTML='<div class="empty-result">Đang tải kho thật…</div>';
    $('cockpit-vins').innerHTML='<div class="empty-result">Đang tải danh sách VIN…</div>';
    $('cockpit-detail').innerHTML='<div class="empty-result">Đang đồng bộ thông số…</div>';
    return;
  }

  const keys=[...new Set(visible.map(liveKey))];
  if(cockpitGroup!=='ALL'&&!keys.includes(cockpitGroup))cockpitGroup='ALL';
  $('cg-count').textContent=keys.length+' nhóm';

  $('cockpit-groups').innerHTML=(visible.length?`<button class="group-item ${cockpitGroup==='ALL'?'active':''}" data-cg="ALL">
    <div class="group-thumb">${visible[0]?.imageInfo?.src?`<img data-live-image src="${esc(visible[0].imageInfo.src)}" alt="">`:'<span>ALL</span>'}</div>
    <div class="group-meta"><strong>Tất cả dòng xe</strong><span>Toàn bộ kết quả lọc</span></div>
    <div class="group-badge"><b>${visible.filter(c=>c.status==='Chưa ghép').length}</b><span>/${visible.length} xe</span></div>
  </button>`:'')+keys.map(k=>{
    const g=visible.filter(c=>liveKey(c)===k);
    const c=g[0];
    return `<button class="group-item ${cockpitGroup===k?'active':''}" data-cg="${esc(k)}">
      <div class="group-thumb">${c.imageInfo?.src?`<img data-live-image src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing">—</div>'}</div>
      <div class="group-meta"><strong>${esc(c.model)}</strong><span><i class="swatch" style="--paint:${c.paint};width:9px;height:9px;margin:0"></i>${esc(c.color||'—')}</span></div>
      <div class="group-badge"><b>${g.filter(x=>x.status==='Chưa ghép').length}</b><span>/${g.length} xe</span></div>
    </button>`;
  }).join('')||'<div class="empty-result">Không có nhóm xe phù hợp.</div>';

  const groupPool=cockpitGroup==='ALL'?visible:visible.filter(c=>liveKey(c)===cockpitGroup);
  const versions=[...new Set(groupPool.map(c=>c.version).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  if(cockpitVersion&&!versions.includes(cockpitVersion))cockpitVersion='';
  $('cockpit-version').innerHTML='<option value="">Tất cả phiên bản</option>'+versions.map(v=>`<option value="${esc(v)}" ${v===cockpitVersion?'selected':''}>${esc(v)}</option>`).join('');

  const vinList=groupPool.filter(c=>!cockpitVersion||c.version===cockpitVersion);
  if(!vinList.some(c=>c.vin===selectedVIN))selectedVIN=vinList[0]?.vin||'';
  $('cv-title').textContent=cockpitGroup==='ALL'?'2 · Danh sách VIN':'2 · '+cockpitGroup.split('|')[0];
  $('cv-count').textContent='('+vinList.length+')';

  $('cockpit-vins').innerHTML=vinList.map(c=>`<article class="cockpit-vin ${c.vin===selectedVIN?'active':''}" data-cvin="${esc(c.vin)}" tabindex="0">
    <div class="cockpit-vin-top"><span class="cockpit-vin-code">${esc(c.vin)}</span><span class="status" style="--tone:${tone(c.status)}">${esc(c.status)}</span></div>
    <div class="cockpit-vin-mid"><span>${esc(c.model)} · ${esc(c.version||'—')}</span><span>${esc(c.location||'—')}</span></div>
    <div class="cockpit-vin-bot"><span class="cockpit-vin-holder">${c.holder?'Giữ: '+esc(c.holder):esc((c.color||'—')+' / '+(c.interior||'—'))}</span>${actionHTML(c)}</div>
  </article>`).join('')||'<div class="empty-result">Không có VIN nào trong nhóm này.</div>';

  $('cockpit-groups').querySelectorAll('[data-cg]').forEach(b=>b.onclick=()=>{cockpitGroup=b.dataset.cg;renderStock()});
  $('cockpit-vins').querySelectorAll('[data-cvin]').forEach(row=>{
    row.onclick=e=>{if(e.target.closest('[data-action],[data-more-vin]'))return;selectedVIN=row.dataset.cvin;renderStock()};
    row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectedVIN=row.dataset.cvin;renderStock()}};
  });
  bindActions($('cockpit-vins'));
  bindMore($('cockpit-vins'));
  enhanceImages($('cockpit-groups'));
  renderCockpitDetail();
};
$('cockpit-version').onchange=e=>{cockpitVersion=e.target.value;renderStock()};
const origShowMore25=showMore;
showMore=function(c,trigger){origShowMore25(c,trigger);menu.querySelectorAll('[data-menu-action="detail"],[data-menu-action="logs"]').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=b.dataset.menuAction;closeMore();selectedVIN=c.vin;detailTab=a==='logs'?'logs':'specs';renderStock()})};
document.querySelector('.demo-head p').textContent='Bàn điều hành 3 cột song song · Duyệt Nhóm xe → VIN → Hộ chiếu xe không che màn hình';
document.querySelector('.demo-footer span').textContent='MẪU 25 · TRI-COLUMN SPLIT COCKPIT · DỮ LIỆU KHO THẬT';
'''

write_variant('kho-xe-mau-25.html', 'Kho xe · Mẫu 25 · Bàn điều hành 3 cột trực tiếp', css_25, js_25)


# ==============================================================================
# MẪU 26: Bảng Điều Phối Toàn Kho + Dải Ảnh Dòng Xe + Inspector Cạnh Bên
# ==============================================================================
css_26 = r'''
.demo-tabs{margin-bottom:12px}
.model-strip{display:flex;gap:9px;padding:0 30px 13px;overflow-x:auto;scrollbar-width:thin;flex-shrink:0}
.model-pill{display:flex;align-items:center;gap:9px;border:1px solid #dfe7f2;border-radius:8px;padding:7px 12px;background:#fff;white-space:nowrap;flex-shrink:0}
.model-pill:hover{border-color:#a5bfe0;background:#f7faff}
.model-pill.active{border-color:#205eb4;background:#edf4fe}
.model-pill img{width:48px;height:29px;object-fit:contain}
.model-pill strong{display:block;font-size:12px;color:#1e3554;text-align:left}
.model-pill small{display:block;font-size:10px;color:#7f93ae;text-align:left;margin-top:2px}
.matrix-shell{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 425px;border-top:1px solid var(--line);background:#fff}
.matrix-shell.collapsed{grid-template-columns:minmax(0,1fr)}
.matrix-shell.collapsed .matrix-inspector{display:none}
.matrix-table-wrap{min-height:0;overflow:auto;scrollbar-width:thin}
.matrix-table{width:100%;border-collapse:collapse;font-size:12px}
.matrix-table th{position:sticky;top:0;z-index:2;background:#fbfcfe;color:#8497b2;font-size:10px;font-weight:600;text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
.matrix-table th:last-child{text-align:right;padding-right:22px}
.matrix-table td{padding:10px 14px;border-bottom:1px solid #eef2f8;vertical-align:middle}
.matrix-table tr.vin-tr{cursor:pointer}
.matrix-table tr.vin-tr:hover{background:#f7faff}
.matrix-table tr.vin-tr.active{background:#edf4fe}
.cell-car{display:flex;align-items:center;gap:10px}
.cell-car img{width:54px;height:34px;object-fit:contain;flex-shrink:0}
.cell-car .image-missing{width:54px;height:34px;margin:0;font-size:9px}
.cell-car strong{display:block;font-size:12px;color:#1b3250}
.cell-car small{display:block;font-size:10px;color:#8296b2;margin-top:2px}
.cell-vin strong{font-family:Consolas,monospace;font-size:12px;color:#234e86;font-weight:600}
.cell-vin small{display:block;font-size:10px;color:#879bb5;margin-top:3px}
.cell-color{font-size:11px;color:#4a6382}
.cell-color small{display:block;font-size:10px;color:#879bb5;margin-top:3px}
.cell-loc{font-size:11px;color:#556e8e}
.cell-loc small{display:block;font-size:10px;color:#869ab5;margin-top:3px}
.matrix-table .row-actions .btn{padding:6px 10px;font-size:10px}
.matrix-table .row-actions .primary{min-width:96px}
.matrix-table .more-button{height:28px;min-width:28px;font-size:18px}
.matrix-inspector{border-left:1px solid var(--line);min-height:0;display:flex;flex-direction:column;background:#fff}
.inspector-head{padding:11px 18px;border-bottom:1px solid var(--line);background:#fbfcfe;display:flex;justify-content:space-between;align-items:center}
.inspector-head strong{font-size:12px;color:#2c476b}
.inspector-body{flex:1;min-height:0;overflow-y:auto;padding:16px 20px;scrollbar-width:thin}
@media(max-width:1420px){
  .matrix-shell{grid-template-columns:minmax(0,1fr) 375px}
  .matrix-table td,.matrix-table th{padding:9px 10px}
  .col-hide-md{display:none}
}
@media(max-width:1080px){
  .matrix-shell{grid-template-columns:minmax(0,1fr)}
  .matrix-inspector{display:none}
}
'''

js_26 = r'''
let matrixModel='',inspectorOpen=true;
const gallery26=$('stock-gallery');
const stripEl=document.createElement('div');
stripEl.id='model-strip';
stripEl.className='model-strip';
const matrixShell=document.createElement('div');
matrixShell.id='variant-workspace';
matrixShell.className='matrix-shell';
matrixShell.innerHTML=`
  <div class="matrix-table-wrap" id="matrix-table-wrap"></div>
  <aside class="matrix-inspector" aria-label="Chi tiết xe đang chọn">
    <div class="inspector-head"><strong id="insp-title">Chi tiết VIN</strong><button class="btn small" id="toggle-inspector" title="Thu gọn khung chi tiết">Ẩn khung →</button></div>
    <div class="inspector-body" id="inspector-body"></div>
  </aside>`;
gallery26.replaceWith(stripEl,matrixShell);

const reopenBtn=document.createElement('button');
reopenBtn.id='reopen-inspector';
reopenBtn.className='btn';
reopenBtn.textContent='Hiện khung chi tiết';
reopenBtn.hidden=true;
$('export-demo').after(reopenBtn);

$('toggle-inspector').onclick=()=>{inspectorOpen=false;matrixShell.classList.add('collapsed');reopenBtn.hidden=false};
reopenBtn.onclick=()=>{inspectorOpen=true;matrixShell.classList.remove('collapsed');reopenBtn.hidden=true;renderStock()};

function onLiveReset(){matrixModel=''}
function onLiveLoaded(){selectedVIN=stock[0]?.vin||''}

function renderMatrixInspector(){
  if(!inspectorOpen)return;
  const host=$('inspector-body');
  if(!selectedVIN||!getVIN(selectedVIN)){
    host.innerHTML='<div class="empty-result">Bấm vào một dòng xe bên trái để xem chi tiết 18 trường.</div>';
    $('insp-title').textContent='Chi tiết VIN';
    return;
  }
  $('insp-title').textContent='Hộ chiếu · '+selectedVIN;
  const drawerDetail=$('vin-detail');
  const tempId=drawerDetail.id;
  drawerDetail.id='vin-detail-backup-26';
  host.id='vin-detail';
  renderDetail();
  host.id='inspector-body';
  drawerDetail.id=tempId;
}

renderStock=function(){
  closeMore();
  const baseVisible=filteredStock();
  const models=[...new Set(baseVisible.map(c=>c.model))];
  if(matrixModel&&!models.includes(matrixModel))matrixModel='';
  const visible=matrixModel?baseVisible.filter(c=>c.model===matrixModel):baseVisible;

  $('total-count').textContent=stock.length;
  $('stock-count').textContent=visible.length+' / '+stock.length+' xe';
  const statuses=['',...new Set(['Chưa ghép','Đang giữ','Đã ghép',...stock.map(c=>c.status)])];
  $('stock-tabs').innerHTML=statuses.map(s=>`<button class="${s===statusChoice?'on':''}" data-stock-status="${esc(s)}">${esc(s||'Tất cả xe')}<small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('');
  $('stock-tabs').querySelectorAll('[data-stock-status]').forEach(b=>b.onclick=()=>{statusChoice=b.dataset.stockStatus;renderStock()});

  stripEl.innerHTML=(baseVisible.length?`<button class="model-pill ${!matrixModel?'active':''}" data-mstrip=""><div><strong>Tất cả dòng</strong><small>${baseVisible.filter(c=>c.status==='Chưa ghép').length} chưa ghép / ${baseVisible.length}</small></div></button>`:'')+models.map(m=>{
    const g=baseVisible.filter(c=>c.model===m);
    const sample=g.find(c=>c.imageInfo?.src)||g[0];
    return `<button class="model-pill ${matrixModel===m?'active':''}" data-mstrip="${esc(m)}">${sample?.imageInfo?.src?`<img data-live-image src="${esc(sample.imageInfo.src)}" alt="${esc(m)}">`:''}<div><strong>${esc(m)}</strong><small>${g.filter(c=>c.status==='Chưa ghép').length} chưa ghép / ${g.length}</small></div></button>`;
  }).join('');
  stripEl.querySelectorAll('[data-mstrip]').forEach(b=>b.onclick=()=>{matrixModel=b.dataset.mstrip;renderStock()});
  enhanceImages(stripEl);

  if(loadingLive){
    $('matrix-table-wrap').innerHTML='<div class="empty-result">Đang tải bảng điều phối kho thật…</div>';
    return;
  }
  if(!visible.some(c=>c.vin===selectedVIN))selectedVIN=visible[0]?.vin||'';

  $('matrix-table-wrap').innerHTML=visible.length?`<table class="matrix-table">
    <thead><tr><th>Dòng xe / Phiên bản</th><th>Số VIN / Mã DMS</th><th>Ngoại thất / Nội thất</th><th class="col-hide-md">Kho / Người giữ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
    <tbody>${visible.map(c=>`<tr class="vin-tr ${c.vin===selectedVIN?'active':''}" data-mtr="${esc(c.vin)}" tabindex="0">
      <td><div class="cell-car">${c.imageInfo?.src?`<img data-live-image src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing">—</div>'}<div><strong>${esc(c.model)}</strong><small>${esc(c.version||'Tiêu chuẩn')}</small></div></div></td>
      <td class="cell-vin"><strong>${esc(c.vin)}</strong><small>DMS: ${esc(c.dms||'—')} · Máy: ${esc(c.engine||'—')}</small></td>
      <td class="cell-color"><span><i class="swatch" style="--paint:${c.paint};width:10px;height:10px"></i>${esc(c.color||'—')}</span><small>Nội thất: ${esc(c.interior||'—')}</small></td>
      <td class="cell-loc col-hide-md"><span>${esc(c.location||'—')}</span><small>${c.holder?'Giữ: '+esc(c.holder):'Chưa có người giữ'}</small></td>
      <td><span class="status" style="--tone:${tone(c.status)}">${esc(c.status)}</span>${isMine(c)?'<div style="font-size:10px;color:#205eb4;margin-top:3px">Tôi đang giữ</div>':''}</td>
      <td>${actionHTML(c)}</td>
    </tr>`).join('')}</tbody></table>`:'<div class="empty-result">Không có xe phù hợp bộ lọc hiện tại.</div>';

  $('matrix-table-wrap').querySelectorAll('[data-mtr]').forEach(tr=>{
    tr.onclick=e=>{if(e.target.closest('[data-action],[data-more-vin]'))return;selectedVIN=tr.dataset.mtr;if(!inspectorOpen){inspectorOpen=true;matrixShell.classList.remove('collapsed');reopenBtn.hidden=true}renderStock()};
    tr.onkeydown=e=>{if(e.target===tr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectedVIN=tr.dataset.mtr;renderStock()}};
  });
  bindActions($('matrix-table-wrap'));
  bindMore($('matrix-table-wrap'));
  enhanceImages($('matrix-table-wrap'));
  renderMatrixInspector();
};
const origShowMore26=showMore;
showMore=function(c,trigger){origShowMore26(c,trigger);menu.querySelectorAll('[data-menu-action="detail"],[data-menu-action="logs"]').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=b.dataset.menuAction;closeMore();selectedVIN=c.vin;detailTab=a==='logs'?'logs':'specs';inspectorOpen=true;matrixShell.classList.remove('collapsed');reopenBtn.hidden=true;renderStock()})};
document.querySelector('.demo-head p').textContent='Bảng điều phối mật độ cao toàn kho · Lọc nhanh theo ảnh dòng xe · Khung hộ chiếu cố định bên phải';
document.querySelector('.demo-footer span').textContent='MẪU 26 · BẢNG ĐIỀU PHỐI TOÀN KHO + SIDE INSPECTOR';
'''

write_variant('kho-xe-mau-26.html', 'Kho xe · Mẫu 26 · Bảng điều phối toàn kho', css_26, js_26)


# ==============================================================================
# MẪU 27: Hybrid Quick-Hold Cards (Thẻ Ảnh Nhóm Xe + Giữ Nhanh 2 VIN Tại Chỗ)
# ==============================================================================
css_27 = r'''
.demo-gallery{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:2px 30px 24px}
.quick-card{border:1px solid #dfe7f2;border-radius:9px;background:#fff;padding:17px 19px 15px;display:flex;flex-direction:column;min-width:0}
.quick-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.quick-top h2{font-size:21px;margin:0;font-weight:650}
.quick-pills{display:flex;gap:8px;font-size:10px;color:#7d91ad}
.quick-pills b{color:#209768;font-weight:600}
.quick-photo{width:100%;padding:0;margin:6px 0 8px;display:block;height:112px}
.quick-photo img{width:100%;height:112px;object-fit:contain;display:block}
.quick-photo .image-missing{height:112px;margin:0}
.quick-color{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#58708f;padding-bottom:10px;border-bottom:1px solid var(--line)}
.quick-color span:first-child{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.quick-color small{color:#8da0ba;font-size:10px;white-space:nowrap}
.inline-vins{display:flex;flex-direction:column}
.inline-vin{padding:10px 0;border-bottom:1px solid #eef2f8;display:flex;flex-direction:column;gap:7px}
.inline-vin-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.inline-vin-btn{font-family:Consolas,monospace;font-size:11.5px;color:#24528a;padding:0;font-weight:600;text-align:left}
.inline-vin-btn:hover{text-decoration:underline}
.inline-vin-sub{display:flex;justify-content:space-between;align-items:center;gap:8px}
.inline-vin-meta{font-size:10px;color:#7f93ae;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inline-vin .row-actions .btn{padding:6px 9px;font-size:10px}
.inline-vin .row-actions .primary{min-width:92px}
.inline-vin .more-button{height:27px;min-width:27px;font-size:17px}
.quick-more{margin-top:11px;width:100%;border:1px solid #dae3f0;border-radius:5px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#235ba0;background:#fbfcff}
.quick-more:hover{background:#edf4ff;border-color:#9fbbe0}
@media(max-width:1320px){.demo-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''

js_27 = r'''
const priorityRank=s=>s==='Chưa ghép'?0:s==='Đang giữ'?1:2;
renderStock=function(){
  closeMore();
  const visible=filteredStock();
  $('total-count').textContent=stock.length;
  $('stock-count').textContent=visible.length+' / '+stock.length+' xe';
  const statuses=['',...new Set(['Chưa ghép','Đang giữ','Đã ghép',...stock.map(c=>c.status)])];
  $('stock-tabs').innerHTML=statuses.map(s=>`<button class="${s===statusChoice?'on':''}" data-stock-status="${esc(s)}">${esc(s||'Tất cả xe')}<small>${s?stock.filter(c=>c.status===s).length:stock.length}</small></button>`).join('');
  const keys=[...new Set(visible.map(liveKey))];
  $('stock-gallery').innerHTML=keys.map(key=>{
    const group=[...visible.filter(c=>liveKey(c)===key)].sort((a,b)=>priorityRank(a.status)-priorityRank(b.status)||a.vin.localeCompare(b.vin));
    const c=group[0];
    const avail=group.filter(x=>x.status==='Chưa ghép').length;
    const held=group.filter(x=>x.status==='Đang giữ').length;
    const topVINs=group.slice(0,2);
    return `<section class="quick-card">
      <div class="quick-top"><h2>${esc(c.model)}</h2><div class="quick-pills"><span><b>${avail}</b> chưa ghép</span><span>· ${held} giữ · ${group.length} xe</span></div></div>
      <button class="quick-photo" data-live-group="${esc(key)}" aria-label="Xem nhóm ${esc(c.model+' '+c.color)}">
        ${c.imageInfo?.src?`<img data-live-image src="${esc(c.imageInfo.src)}" alt="${esc(c.model)}">`:'<div class="image-missing">Chưa có ảnh đúng cấu hình</div>'}
      </button>
      <div class="quick-color"><span><i class="swatch" style="--paint:${c.paint};margin:0"></i>${esc(c.color||'—')} / ${esc(c.interior||'—')}</span><small>Ưu tiên VIN chưa ghép</small></div>
      <div class="inline-vins">
        ${topVINs.map(v=>`<div class="inline-vin">
          <div class="inline-vin-top"><button class="inline-vin-btn" data-open-vin="${esc(v.vin)}">${esc(v.vin)}</button><span class="status" style="--tone:${tone(v.status)};font-size:10px">${esc(v.status)}</span></div>
          <div class="inline-vin-sub"><span class="inline-vin-meta">${esc(v.version||'Tiêu chuẩn')} · ${esc(v.location||'—')}${v.holder?' · '+esc(v.holder):''}</span>${actionHTML(v)}</div>
        </div>`).join('')}
      </div>
      <button class="quick-more" data-live-group="${esc(key)}"><span>${group.length>2?'Xem đầy đủ '+group.length+' VIN (còn '+(group.length-2)+' xe)':'Mở bảng danh sách & chi tiết ('+group.length+' VIN)'}</span><span>→</span></button>
    </section>`;
  }).join('')||'<div class="empty-result">'+(loadingLive?'Đang tải dữ liệu kho thật…':'Không có xe phù hợp bộ lọc hiện tại.')+'</div>';

  $('stock-tabs').querySelectorAll('[data-stock-status]').forEach(b=>b.onclick=()=>{statusChoice=b.dataset.stockStatus;renderStock()});
  $('stock-gallery').querySelectorAll('[data-live-group]').forEach(b=>b.onclick=()=>{liveGroupKey=b.dataset.liveGroup;const c=stock.find(x=>liveKey(x)===liveGroupKey);if(c)openDrawer(c.model,'',true)});
  $('stock-gallery').querySelectorAll('[data-open-vin]').forEach(b=>b.onclick=()=>{const c=getVIN(b.dataset.openVin);if(c){liveGroupKey=liveKey(c);openDrawer(c.model,c.vin,true)}});
  bindActions($('stock-gallery'));
  bindMore($('stock-gallery'));
  enhanceImages($('stock-gallery'));
};
document.querySelector('.demo-head p').textContent='Thẻ ảnh kèm 2 VIN ưu tiên chưa ghép · Bấm giữ xe 24h ngay ngoài thẻ hoặc mở toàn bộ danh sách';
document.querySelector('.demo-footer span').textContent='MẪU 27 · KỆ TRƯNG BÀY GIỮ NHANH VIN TẠI CHỖ';
'''

write_variant('kho-xe-mau-27.html', 'Kho xe · Mẫu 27 · Kệ trưng bày giữ nhanh VIN tại chỗ', css_27, js_27)

