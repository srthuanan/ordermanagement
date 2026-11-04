const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const files = {
  Header: 'components/layout/Header.tsx',
  NotificationSheet: 'components/layout/NotificationSheet.tsx',
  useNotification: 'hooks/useNotification.ts',
  ManageTabsSheet: 'components/admin/ManageTabsSheet.tsx',
  CreateRequestModal: 'components/modals/CreateRequestModal.tsx',
};
const sources = {};
for (const [key, file] of Object.entries(files)) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }, reportDiagnostics: true });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(file + ': ' + errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  sources[key] = result.outputText;
}
const react = fs.readFileSync(path.join(path.dirname(require.resolve('react/package.json')), 'umd/react.development.js'), 'utf8');
const reactDOM = fs.readFileSync(path.join(path.dirname(require.resolve('react-dom/package.json')), 'umd/react-dom.development.js'), 'utf8');
const css = ['components/layout/notification-sheet.css','components/layout/sidebar-navigation.css','components/modals/create-request-sheet.css'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const runtime = `
const h=React.createElement, sources=${JSON.stringify(sources)}, cache={};
const Null=()=>null;const Icon=({size=16,...props})=>h('svg',{...props,width:size,height:size,viewBox:'0 0 24 24'});
const data=[{id:'demo-1',message:'Xe thử vừa được giữ.',timestamp:new Date().toISOString(),type:'stock_hero',isRead:false}];
const api={fetchNotifications:async()=>({notifications:data,unreadCount:1}),markAllNotificationsAsRead:async()=>{},markNotificationAsRead:async()=>{}};
const supabase={channel:()=>{const chain={on:()=>chain,subscribe:()=>chain};return chain},removeChannel:()=>{}};
function load(key){if(cache[key])return cache[key];const exports={};cache[key]=exports;new Function('require','exports',sources[key])(req,exports);return exports}
function req(name){if(name==='react')return React;if(name==='react-dom')return ReactDOM;if(name==='lucide-react')return new Proxy({},{get:()=>Icon});if(name.endsWith('.css'))return {};if(name.endsWith('/NotificationSheet'))return load('NotificationSheet');if(name.endsWith('/apiService'))return api;if(name.endsWith('/supabaseClient'))return {supabase};if(name.endsWith('/swapService'))return {getSwapRequests:async()=>({status:'SUCCESS',data:[]})};if(name.endsWith('/visitCounterService'))return {recordAndGetVisitCount:async()=>0};if(name.endsWith('/HolidayThemeDecorator'))return {isMidAutumnSeason:()=>false,isHalloweenSeason:()=>false};if(name.endsWith('/GlobalNotificationContext'))return {useGlobalNotificationContext:()=>({notification:null,isDismissed:true,dismissNotification:()=>{}})};if(name.endsWith('/Button'))return {__esModule:true,default:({children,variant,...props})=>h('button',props,children)};if(name.endsWith('/RequestForm'))return {__esModule:true,default:()=>h('div',null,h('label',null,'Tên khách hàng',h('input',{id:'review-customer'})))};if(/\\.(webp|png|gif)|\\?url$/.test(name))return {__esModule:true,default:'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='};return new Proxy({__esModule:true,default:Null},{get:(target,key)=>target[key]||Null})}
const Header=load('Header').default, useNotification=load('useNotification').useNotification, ManageTabs=load('ManageTabsSheet').default, CreateRequest=load('CreateRequestModal').default;
function App(){const n=useNotification(()=>{});const [tabs,setTabs]=React.useState(false),[request,setRequest]=React.useState(false);window.sheetReviewState={notification:n.isNotificationPanelOpen,tabs,request};window.sheetReviewEvents=window.sheetReviewEvents||[];
React.useEffect(()=>{const close=e=>{if(e.detail?.except!=='notification')n.setIsNotificationPanelOpen(false);setTabs(false);setRequest(false)};window.addEventListener('close-all-sheets',close);return()=>window.removeEventListener('close-all-sheets',close)},[n.setIsNotificationPanelOpen]);
return h(React.Fragment,null,h(Header,{presentation:'sidebar',setCreateRequestData:()=>setRequest(true),toggleNotificationPanel:n.toggleNotificationPanel,unreadCount:n.unreadCount,isNotificationPanelOpen:n.isNotificationPanelOpen,notifications:n.notifications,handleMarkAllAsRead:()=>window.sheetReviewEvents.push('mark-read'),handleNotificationClick:()=>window.sheetReviewEvents.push('notification-click'),onLogout:()=>{},notificationContainerRef:n.notificationContainerRef,activeView:'stock',setActiveView:()=>{},isCurrentUserAdmin:false,onOpenGlobalSearch:()=>{},currentUser:'Test',currentUserName:'test',userRole:'TVBH',onOpenChangePassword:()=>{},isStockEnabled:true,isTogglingStock:false,handleToggleStockGlobal:()=>{},isCrmEnabled:true,isChatEnabled:false,isTogglingChat:false,handleToggleChatGlobal:()=>{},requestNotificationPermission:async()=>false}),h('div',{className:'review-controls'},h('button',{id:'open-tabs',onClick:()=>setTabs(true)},'Mở cài đặt tab'),h('button',{id:'open-request',onClick:()=>setRequest(true)},'Mở yêu cầu ghép xe'),h('button',{id:'behind',onClick:()=>window.sheetReviewEvents.push('background-action')},'Nút phía sau sheet')),h(ManageTabs,{isOpen:tabs,onClose:()=>setTabs(false),categories:{test:{label:'Kiểm tra',icon:'fa-car',views:['matching']}},labels:{matching:'Ghép xe'},hiddenTabs:[],toggleTabVisibility:()=>window.sheetReviewEvents.push('tab-toggle')}),h(CreateRequest,{isOpen:request,onClose:()=>setRequest(false),onSuccess:()=>{},showToast:()=>{},hideToast:()=>{},existingOrderNumbers:[],currentUser:'Test',vehicleAnalyticsData:{},onOpenImagePreview:()=>{}}))}
ReactDOM.createRoot(document.getElementById('root')).render(h(App));
`;
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;font:14px 'Segoe UI',sans-serif;color:#17263b}button{cursor:pointer}#root{height:100vh}.review-controls{margin:30px 0 0 620px;display:flex;gap:15px;flex-direction:column;align-items:flex-start}.review-controls button{padding:12px}input{padding:12px;border:1px solid #ccc}${css}</style><div id="root"></div><script>${react}</script><script>${reactDOM}</script><script>(()=>{${runtime}})();</script></html>`;
const target=path.join(root,'output/sheet-dismissal');fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'preview.html'),html);
console.log('PASS: compiled actual Header, notification hook, NotificationSheet, ManageTabsSheet, CreateRequestModal; isolated services.');
