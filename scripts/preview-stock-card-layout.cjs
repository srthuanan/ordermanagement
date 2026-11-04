const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'components/StockView.tsx');
const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  reportDiagnostics: true,
});
const errors = (output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
const react = fs.readFileSync(path.join(path.dirname(require.resolve('react/package.json')), 'umd/react.development.js'), 'utf8');
const dom = fs.readFileSync(path.join(path.dirname(require.resolve('react-dom/package.json')), 'umd/react-dom.development.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'components/stock/faceted-stock.css'), 'utf8');
const fixtures = [
  ['VF 3', 'Plus', 'Chưa ghép', ''],
  ['VF 3', 'Plus', 'Đã ghép', 'ĐÀO MINH KỲ'],
  ['VF 7', 'Plus_Metal Tiêu chuẩn 2 (1 Cầu)', 'Chưa ghép', ''],
  ['VF 6', 'Eco', 'Chưa ghép', ''],
  ['VF 6', 'Plus', 'Đang giữ', 'LÊ THỊ HƯƠNG TRÀ'],
  ['VF 5', 'Plus', 'Đang giữ', 'NGUYỄN TRẦN HOÀNG THANH'],
  ['VF 8', 'Eco All New phiên bản cao cấp với tên cấu hình rất dài để kiểm tra xuống dòng', 'Đã ghép', 'NGUYỄN THỊ KHÁNH HUYỀN'],
  ['LIMO', 'LIMO', 'Chưa ghép', ''],
  ['VF 5', 'Plus', 'Chưa ghép', ''],
].map(([model, version, status, holder], i) => ({ VIN: `RLLVAGND7TH${String(836455 + i)}`, 'Dòng xe': model, 'Phiên bản': version, 'Trạng thái': status, 'Ngoại thất': i === 4 ? 'Urban Mint (CE1W)' : 'White (CE18)', 'Nội thất': i === 4 ? 'Brown' : 'Black', 'Vị trí': i === 2 ? 'Đang vận tải' : 'Q12 (HCM)', 'Mã DMS': 'N31913', 'Số máy': `VFCAB269${290132 + i}`, 'Người Giữ Xe': holder }));
const runtime = `
const h=React.createElement;const fixtureStock=${JSON.stringify(fixtures)};window.stockReviewEvents=[];
const CarImage=props=>h('div',null,h('img',{src:'../../public/pictures/'+props.model.toLowerCase().replace(/\\s+/g,'')+(props.exteriorColor.includes('CE1W')?'-ce1w':'-ce18')+'.webp',alt:props.alt}));
const Null=()=>null;const exports={};function require(name){if(name==='react')return React;if(name.endsWith('.css'))return {};if(name.endsWith('/CarImage'))return CarImage;if(name.endsWith('/styleUtils'))return {getExteriorSwatchColor:value=>value?.includes('CE1W')?'#a3b49b':'#fff',getExteriorColorStyle:()=>({})};if(name.endsWith('/stringUtils'))return {includesNormalized:(value,q)=>String(value||'').toLowerCase().includes(q)};if(name.endsWith('/stockService'))return {autoSyncCyberLocationsIfNeeded:async()=>({triggered:false}),triggerDmsRadarSync:()=>Promise.reject(new Error('Disabled in visual preview'))};return new Proxy({__esModule:true,default:Null},{get:(target,key)=>target[key]||Null})}
${output.outputText}
const ReviewStockView=exports.default;const event=(action,vin)=>{window.stockReviewEvents.push({action,vin});document.getElementById('message').textContent='Thao tác thử: '+action+' · '+vin};
function ReviewHarness(){const [data,setData]=React.useState(fixtureStock);window.stockReviewData=data;window.updateStockReviewData=setData;const act=(action,vin)=>{event(action,vin);setData(prev=>prev.map(c=>c.VIN!==vin?c:action==='hold'?{...c,'Trạng thái':'Đang giữ','Người Giữ Xe':'LÊ THỊ HƯƠNG TRÀ'}:action==='release'?{...c,'Trạng thái':'Chưa ghép','Người Giữ Xe':''}:c).reverse())};return h(ReviewStockView,{stockData:data,currentUser:'LÊ THỊ HƯƠNG TRÀ',isAdmin:true,isLoading:false,error:null,allOrders:[],highlightedVins:new Set(),queuedVins:[],canHoldMore:true,onHoldCar:vin=>act('hold',vin),onReleaseCar:vin=>act('release',vin),onJoinQueue:vin=>act('queue',vin),onLeaveQueue:vin=>act('leave',vin),onCreateRequestForVehicle:c=>act('match',c.VIN),onOpenExtensionModal:c=>act('extension',c.VIN),showToast:(...args)=>event('toast',args[1]),refetchStock:()=>{},onNavigateToInquiry:()=>{},isSidebarCollapsed:false,processingVin:null})}
ReactDOM.createRoot(document.getElementById('root')).render(h(ReviewHarness));
`;
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kho xe · Bố cục thẻ mới</title><style>*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:'Segoe UI',sans-serif}button,input{font:inherit}button{cursor:pointer}#root{height:calc(100vh - 32px)}#message{height:32px;padding:8px 20px;background:#152337;color:#aabbcf;font-size:10px}button:focus-visible{outline:2px solid #3275d3;outline-offset:2px}${css}</style></head><body><div id="root"></div><div id="message">Bản xem trước bố cục · Dữ liệu thử · Không kết nối nghiệp vụ</div><script>${react}</script><script>${dom}</script><script>${runtime}</script></body></html>`;
const target = path.join(root, 'output/stock-card-redesign');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'preview.html'), html.replace(`<script>${runtime}</script>`, `<script>(()=>{${runtime}})();</script>`));
console.log('PASS: StockView TSX transpilation; created isolated preview from actual component (9 vehicles, long versions, all hold states; no production API).');
