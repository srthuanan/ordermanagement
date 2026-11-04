from pathlib import Path

root=Path(__file__).resolve().parents[2]
base=(root/'public/previews/kho-xe-mau-17.html').read_text(encoding='utf-8')
css=r'''
.photo-gallery{grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:315px;gap:17px;padding-bottom:15px}.hybrid-shelf{border:1px solid #e1e8f2;border-radius:7px;background:#fff;padding:16px 18px 12px;min-width:0}.hybrid-shelf.has-selection{border-color:#89aade;background:#fbfdff}.hybrid-title{display:flex;align-items:center;justify-content:space-between}.hybrid-title h2{font-size:20px;font-weight:600;margin:0}.hybrid-title span{font-size:11px;color:#8a9db7}.hybrid-image{display:block;width:100%;padding:0;margin:0;cursor:pointer}.hybrid-image img{display:block;width:100%;height:104px;object-fit:contain;margin:4px 0}.hybrid-caption{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#8a9cb3;margin-bottom:11px}.hybrid-caption .swatch{width:9px;height:9px}.hybrid-vehicle{position:relative;padding:10px 9px 9px;border-top:1px solid #e8edf5;cursor:pointer}.hybrid-vehicle.selected{background:#edf4ff;border-radius:4px;box-shadow:inset 2px 0 #2b69bd}.hybrid-vehicle .vin-top{display:flex;align-items:center;gap:10px;justify-content:space-between}.hybrid-vin{font-family:Consolas,monospace;color:#42658e;font-size:11px;letter-spacing:.1px}.hybrid-version{font-size:10px;color:#8b9db6;margin-left:8px;font-family:'Segoe UI',sans-serif}.hybrid-vehicle .status{font-size:10px;gap:5px}.hybrid-vehicle .vin-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px}.hybrid-meta{font-size:10px;color:#879bb4}.hybrid-meta b{font-weight:400;color:#4f6a8d;margin-left:9px}.hybrid-actions{display:flex;gap:6px}.hybrid-actions .btn{font-size:10px;padding:6px 9px;border-radius:4px;white-space:nowrap}.hybrid-actions .primary{min-width:91px}.photo-body{margin-bottom:0}.hybrid-vehicle:focus-visible{outline:2px solid #3275d3;outline-offset:1px}.photo-tabs{margin-bottom:18px}.photo-header{padding-top:22px;padding-bottom:17px}.compact-note{margin-top:10px;padding-top:10px}.photo-workspace footer{padding-top:10px;padding-bottom:10px}.hybrid-shelf .empty-vin{border-top:1px solid var(--line);padding-top:12px;font-size:10px;color:#a0adc0}
'''
css += '.variant-17 .photo-gallery{grid-auto-rows:335px}'
js=r'''
renderList=function(){
const items=visibleCars();let markup='';
for(const m of ['VF 3','VF 5','VF 6','VF 7','VF 8','LIMO']){
const group=items.filter(c=>c.model===m);if(!group.length)continue;
markup+=`<section class="hybrid-shelf ${group.some(c=>c.i===selected)?'has-selection':''}"><div class="hybrid-title"><h2>${m}</h2><span>${group.length} xe · ${group.filter(c=>c.status==='Chưa ghép').length} chưa ghép</span></div><button class="hybrid-image" data-pick="${group[0].i}" aria-label="Chọn dòng ${m}"><img src="../pictures/${group[0].image}.webp" alt="${m}"></button><div class="hybrid-caption"><span><i class="swatch"></i>White (CE18) · Black</span><span>Kho Thuận An</span></div>${group.map(c=>`<article class="hybrid-vehicle ${c.i===selected?'selected':''}" data-index="${c.i}" tabindex="0" aria-label="Chọn ${c.model} VIN ${c.vin}"><div class="vin-top"><span class="hybrid-vin">${c.vin}<small class="hybrid-version">${c.version}</small></span><span class="status" style="--tone:${tone(c.status)}">${c.status}</span></div><div class="vin-bottom"><span class="hybrid-meta">${c.park}<b>${c.age} ngày</b></span><span class="hybrid-actions"><button class="btn" data-car-action="detail" data-car="${c.i}">Chi tiết ↗</button><button class="btn primary" data-car-action="hold" data-car="${c.i}" ${c.status==='Chưa ghép'?'':'disabled'}>Giữ xe (24h)</button></span></div></article>`).join('')}</section>`;
}
$('gallery').innerHTML=markup||'<div class="photo-empty">Không tìm thấy xe phù hợp.</div>';$('count').textContent=items.length+' / 8 xe';
$('photo-tabs').innerHTML=['','Chưa ghép','Đang giữ','Đã ghép'].map(s=>`<button data-status="${s}" class="${s===photoStatus?'on':''}">${s||'Tất cả xe'}<small>${s?cars.filter(c=>c.status===s).length:8}</small></button>`).join('');
document.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{photoStatus=b.dataset.status;renderList()});
document.querySelectorAll('[data-index],[data-pick]').forEach(b=>{b.onclick=()=>{selected=Number(b.dataset.index??b.dataset.pick);renderList()};b.onkeydown=e=>{if(e.target===b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selected=Number(b.dataset.index??b.dataset.pick);renderList()}}});
document.querySelectorAll('[data-car-action]').forEach(b=>b.onclick=e=>{e.stopPropagation();const c=cars[Number(b.dataset.car)];if(b.dataset.carAction==='hold')toast('Mẫu giữ xe 24h · '+c.model+' · '+c.vin+' · Chưa ghi vào hệ thống');else toast(c.model+' '+c.version+' · '+c.vin+' · '+c.color+' · '+c.park+' · Tồn '+c.age+' ngày')});
};
$('search').oninput=e=>{photoQuery=e.target.value.toLowerCase();renderList()};$('photo-model').onchange=e=>{photoModel=e.target.value;renderList()};
document.querySelector('.compact-note').innerHTML='<span>6 nhóm dòng xe · 8 VIN · Thao tác trực tiếp tại mỗi VIN</span><span>Dữ liệu minh họa · Chưa kết nối nghiệp vụ</span>';
document.querySelector('.photo-workspace footer span').textContent='MẪU 20 · KẾT HỢP MẪU 16 + 17';
renderList();
'''
html=base.replace('</style>',css+'</style>').replace('</body>','<script>'+js+'</script></body>')
html=html.replace('Kho xe · Mẫu 17 · Thẻ ảnh gọn 5 cột · Thao tác tại xe','Kho xe · Mẫu 20 · Kết hợp 16 + 17')
(root/'public/previews/kho-xe-mau-20.html').write_text(html,encoding='utf-8')
print('Created hybrid preview 20')
