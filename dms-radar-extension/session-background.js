'use strict';
const SESSION_URL='http://localhost:3001/api/ndp/session';
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type!=='VF_NDP_SESSION_SYNC')return;
  let url;try{url=new URL(sender.url);}catch{return;}
  if(sender.id!==chrome.runtime.id||url.origin!=='https://dealer-portal.vinfast.com'||!sender.tab||sender.frameId!==0)return;
  if(typeof message.accessToken!=='string'||message.accessToken.length>12000){reply({success:false});return;}
  fetch(SESSION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:message.accessToken}),signal:AbortSignal.timeout(10000)})
    .then(async response=>reply(response.ok?await response.json():{success:false}))
    .catch(()=>reply({success:false}));
  return true;
});
async function pollTabs(){
  const tabs=await chrome.tabs.query({url:'https://dealer-portal.vinfast.com/*'});
  await Promise.allSettled(tabs.map(tab=>chrome.tabs.sendMessage(tab.id,{type:'VF_NDP_SESSION_POLL'})));
}
function start(){chrome.alarms.create('ndp-session-poll',{periodInMinutes:1});void pollTabs();}
chrome.runtime.onInstalled.addListener(start);
chrome.runtime.onStartup.addListener(start);
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='ndp-session-poll')void pollTabs();});
