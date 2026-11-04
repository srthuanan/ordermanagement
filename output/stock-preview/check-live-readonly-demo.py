from pathlib import Path
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select

root=Path(__file__).resolve().parents[2]
opt=webdriver.ChromeOptions()
opt.add_argument('--headless=new')
opt.add_argument('--allow-file-access-from-files')
opt.add_argument('--log-level=3')
opt.set_capability('goog:loggingPrefs',{'performance':'ALL','browser':'ALL'})
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=opt)
def js(code):return driver.execute_script(code)
def wait_loaded():
    WebDriverWait(driver,75).until(lambda d:d.execute_script('return typeof loadingLive!=="undefined"&&!loadingLive'))
    assert js('return stock.length>0'), driver.find_element(By.CLASS_NAME,'demo-banner').text
def image_wait():
    driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
def screenshot(name):
    image_wait();js('document.getElementById("toast").hidden=true;document.activeElement.blur()')
    driver.save_screenshot(str(root/('output/stock-preview/kho-xe-mau-23-'+name+'.png')))
def select_row(vin):
    el=driver.find_element(By.CSS_SELECTOR,f'[data-show-vin="{vin}"]');el.click()
def show_group(vin):
    el=driver.execute_script('const key=liveKey(getVIN(arguments[0]));return Array.from(document.querySelectorAll(".group-select")).find(b=>b.dataset.liveGroup===key)',vin)
    assert el
    el.click()
def button_for(vin,action):return driver.find_element(By.CSS_SELECTOR,f'#vin-detail [data-action="{action}"][data-vin="{vin}"]')
def confirm():driver.find_element(By.ID,'confirm-action').click()
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    driver.get((root/'public/previews/kho-xe-mau-23.html').as_uri())
    wait_loaded()
    count=js('return stock.length')
    assert js('return stock.every(c=>c.source==="live")')
    assert js('return stock.length===realBaseline.length')
    assert js('return previewNetworkAudit.every(r=>r.method==="GET")')
    assert js('return seedVehicles().length')==0
    source=driver.execute_async_script('const done=arguments[0];readRows("khoxe","vin,trang_thai,nguoi_giu_xe,so_may,ma_dms,so_coc,ma_phien_ban",{order:"vin.asc"}).then(rows=>{window.verifiedRealRows=rows;done({count:rows.length,match:rows.every(r=>{const c=getVIN(String(r.vin).trim().toUpperCase());return c&&c.status===String(r.trang_thai||"Chưa cập nhật").trim()&&c.holder===String(r.nguoi_giu_xe||"").trim()&&c.engine===String(r.so_may||"")&&c.coc===String(r.so_coc||"")&&c.dms===String(r.ma_dms||"")&&c.versionCode===String(r.ma_phien_ban||"")})})}).catch(e=>done({error:e.message}))')
    assert source.get('count')==count and source.get('match'),source
    screenshot('tong-quan')
    eligible=js('return stock.filter(c=>c.status==="Chưa ghép").map(c=>c.vin)')
    assert eligible
    vin=eligible[0]
    show_group(vin)
    group_count=js('return drawerVehicles().length')
    assert len(driver.find_elements(By.CLASS_NAME,'simple-row'))==group_count
    assert js('return drawerVehicles().every(c=>liveKey(c)===liveGroupKey)')
    screenshot('danh-sach-vin')
    select_row(vin)
    assert len(driver.find_elements(By.CLASS_NAME,'field-row'))>=18
    screenshot('chi-tiet-vin')
    before=js('return previewNetworkAudit.length')
    button_for(vin,'hold').click();confirm()
    assert js('return getVIN(selectedVIN).holder===USER&&getVIN(selectedVIN).status==="Đang giữ"')
    assert js('return simulatedCount()')==1
    assert js('return previewNetworkAudit.length')==before
    driver.find_element(By.CSS_SELECTOR,f'#vin-detail [data-more-vin="{vin}"]').click()
    driver.find_element(By.CSS_SELECTOR,'#vin-actions-menu [data-menu-action="release"]').click();confirm()
    assert js('return previewNetworkAudit.length')==before
    # Compare the real source after simulation. Only a new GET is allowed.
    unchanged=driver.execute_async_script('const done=arguments[0];readRows("khoxe","vin,trang_thai,nguoi_giu_xe,so_may,ma_dms,so_coc,ma_phien_ban",{order:"vin.asc"}).then(rows=>done(JSON.stringify(rows)===JSON.stringify(window.verifiedRealRows))).catch(e=>done(false))')
    assert unchanged,'Real inventory changed while testing; inspect without assuming the preview caused it.'
    driver.find_element(By.ID,'close-drawer').click()
    driver.find_element(By.ID,'reset-demo').click()
    assert js('return simulatedCount()')==0
    held=js('return stock.find(c=>c.status==="Đang giữ"&&c.holder)?.vin||""')
    if held:
        show_group(held)
        select_row(held)
        before=js('return previewNetworkAudit.length')
        button_for(held,'queue').click();confirm()
        assert js('return getVIN(selectedVIN).queue.includes(USER)')
        assert js('return previewNetworkAudit.length')==before
        driver.find_element(By.ID,'close-drawer').click();driver.find_element(By.ID,'reset-demo').click()
    # Block every possible mutation verb without sending it to Supabase.
    rejected=driver.execute_async_script('const done=arguments[0];Promise.all(["POST","PATCH","PUT","DELETE"].map(method=>fetch(LIVE_ORIGIN+"/rest/v1/khoxe",{method}).then(()=>false,()=>true))).then(done)')
    assert rejected==[True]*4
    # Remove intentionally blocked attempts from the audit; the performance log below proves none was sent.
    assert js('return previewNetworkAudit.filter(r=>r.method!=="GET").length')==4
    before=js('return previewNetworkAudit.length')
    driver.find_element(By.ID,'load-live-stock').click();wait_loaded()
    assert js('return previewNetworkAudit.length')>before
    assert js('return simulatedCount()')==0
    for width,height in [(1536,790),(1366,768)]:
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False})
        driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
        assert not js('return Array.from(document.querySelectorAll(".group-card")).some(c=>c.scrollHeight>c.clientHeight+1)')
        assert js('return document.documentElement.scrollWidth<=innerWidth')
    sent=[]
    for entry in driver.get_log('performance'):
        event=json.loads(entry['message'])['message']
        if event['method']=='Network.requestWillBeSent':
            request=event['params']['request']
            if '/rest/v1/' in request['url']:sent.append(request['method'])
    assert sent and all(method in ['GET','OPTIONS'] for method in sent),sent
    errors=[e for e in driver.get_log('browser') if e['level']=='SEVERE']
    assert not errors,[(e['message'][:220]) for e in errors]
    print(json.dumps({'result':'PASS','live_vehicles':count,'source_fields_verified':True,'group_vins':group_count,'real_source_unchanged':unchanged,'action_network_requests':0,'remote_mutations_sent':0,'network_methods_sent':sorted(set(sent)),'checks':['real GET loading and paging','exact VIN/status/holder/engine/DMS/COC/version mapping','color/interior group isolation','18 full fields','local-only hold/release/queue','discard simulation','live refresh','write verbs rejected before network','no clipped cards at laptop sizes','browser console clean']},ensure_ascii=False))
except Exception:
    print('Browser diagnostics:',[(e['level'],e['message'][:350]) for e in driver.get_log('browser')])
    raise
finally:
    driver.quit()
