from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

root=Path(__file__).resolve().parents[2]
opt=webdriver.ChromeOptions()
opt.add_argument('--headless=new')
opt.add_argument('--allow-file-access-from-files')
opt.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=opt)
def js(code):return driver.execute_script(code)
def images():driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
def action(name,vin):
    driver.find_element(By.CSS_SELECTOR,f'#vin-detail [data-action="{name}"][data-vin="{vin}"]').click()
def confirm():driver.find_element(By.ID,'confirm-action').click()
def field(name,text):
    el=driver.find_element(By.CSS_SELECTOR,f'#action-form [name="{name}"]');el.clear();el.send_keys(text)
def select_vin(index):
    vin=js(f'return stock[{index}].vin')
    driver.find_element(By.CSS_SELECTOR,f'[data-select-vin="{vin}"]').click()
    return vin
def choose_role(role):Select(driver.find_element(By.ID,'role')).select_by_value(role)
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1100,'deviceScaleFactor':1,'mobile':False})
    driver.get((root/'public/previews/kho-xe-mau-21.html').as_uri())
    driver.find_element(By.ID,'reset-demo').click()
    assert js('return stock.length')==25
    assert js('return plusDay("2026-10-31T14:15:00+07:00")')=='2026-11-02T07:15:00.000Z'
    assert len(driver.find_elements(By.CSS_SELECTOR,'.group-card'))==6
    images();js('document.getElementById("toast").hidden=true;document.activeElement.blur()')
    driver.save_screenshot(str(root/'output/stock-preview/kho-xe-mau-21-tong-quan.png'))
    driver.find_element(By.CSS_SELECTOR,'.group-more[data-open-model="VF 6"]').click()
    assert len(driver.find_elements(By.CSS_SELECTOR,'.list-vin'))==20
    assert len(driver.find_elements(By.CSS_SELECTOR,'.field-row'))==18
    assert '24-09-26 TT-OTO-835257/2026/COC' in driver.find_element(By.ID,'vin-detail').text
    assert 'NGUYỄN HOÀNG PHÚC' in driver.find_element(By.ID,'vin-detail').text
    images();driver.save_screenshot(str(root/'output/stock-preview/kho-xe-mau-21-20-vin.png'))
    vin0=select_vin(0)
    action('queue',vin0);confirm()
    assert js('return stock[0].queue.includes(USER)')
    assert driver.find_element(By.CSS_SELECTOR,'#vin-detail [role="switch"]').get_attribute('aria-checked')=='true'
    action('leave',vin0);confirm();assert not js('return stock[0].queue.includes(USER)')
    vin2=select_vin(2)
    action('hold',vin2);confirm()
    assert js('return stock[2].status==="Đang giữ"&&stock[2].holder===USER')
    assert js('return new Date(stock[2].expiry)-DEMO_NOW')==86400000
    driver.refresh();assert js('return stock[2].holder===USER')
    driver.find_element(By.CSS_SELECTOR,'.group-more[data-open-model="VF 6"]').click()
    vin2=select_vin(2);action('release',vin2);confirm();assert js('return stock[2].status')=='Chưa ghép'
    vin1=select_vin(1);action('extend',vin1);field('reason','Cần thêm thời gian hoàn tất hồ sơ');confirm()
    assert js('return stock[1].extension')
    choose_role('admin');action('approve-extension',vin1);confirm();assert not js('return stock[1].extension')
    assert js('return new Date(stock[1].expiry)-new Date("2026-10-29T14:31:00+07:00")')==86400000
    choose_role('staff');action('match',vin1);field('customer','TRẦN VĂN LỢI');field('order','DEMO-VSO-001');confirm()
    assert js('return stock[1].request.order')=='DEMO-VSO-001'
    assert js('return stock[1].status')=='Đang giữ'
    vin14=select_vin(14);action('swap',vin14);field('reason','Khách muốn đổi VIN cùng cấu hình');confirm()
    assert 'Đề nghị đổi' in js('return stock[14].logs[0].text')
    choose_role('admin');vin0=select_vin(0);action('release',vin0);confirm()
    assert js('return stock[0].holder')=='TRẦN THỊ NGỌC HÀ'
    vin2=select_vin(2);action('edit',vin2);field('vin','INVALID');confirm()
    assert driver.find_element(By.ID,'action-dialog').get_attribute('open') is not None
    assert driver.find_element(By.ID,'modal-error').text
    field('vin',vin2);field('engine','VF-DEMO-UPDATED');field('coc','COC-FULL-LENGTH-DEMO-2026-0000001');confirm()
    assert js('return stock[2].engine')=='VF-DEMO-UPDATED'
    assert 'COC-FULL-LENGTH-DEMO-2026-0000001' in driver.find_element(By.ID,'vin-detail').text
    action('delete',vin2);field('reason','Kiểm tra xóa dữ liệu thử');confirm();assert js('return stock.length')==24
    choose_role('readonly');assert not driver.find_elements(By.CSS_SELECTOR,'#vin-detail [data-action="hold"],#vin-detail [data-action="edit"],#vin-detail [data-action="queue"]')
    vin3=select_vin(2)
    assert js('return getVIN(selectedVIN).coords!==null')
    action('map',vin3);assert driver.find_element(By.CLASS_NAME,'map-schematic').is_displayed();confirm()
    choose_role('staff')
    driver.find_element(By.ID,'drawer-search').send_keys('835257')
    assert len(driver.find_elements(By.CSS_SELECTOR,'.list-vin'))==1
    driver.find_element(By.ID,'drawer-search').clear();js('drawerSearch="";renderDrawer()')
    Select(driver.find_element(By.ID,'drawer-status')).select_by_visible_text('Đã ghép')
    assert len(driver.find_elements(By.CSS_SELECTOR,'.list-vin'))==5
    Select(driver.find_element(By.ID,'drawer-status')).select_by_index(0)
    Select(driver.find_element(By.ID,'drawer-version')).select_by_visible_text('Plus')
    assert all('Plus' in e.text for e in driver.find_elements(By.CSS_SELECTOR,'.list-vin'))
    driver.find_element(By.ID,'close-drawer').click()
    driver.find_element(By.ID,'reset-demo').click()
    assert js('return stock.length')==25
    driver.find_element(By.CSS_SELECTOR,'.group-more[data-open-model="VF 6"]').click();select_vin(1)
    images();js('document.getElementById("toast").hidden=true;document.activeElement.blur();document.getElementById("vin-detail").scrollTop=0;document.getElementById("vin-list").scrollTop=0')
    driver.save_screenshot(str(root/'output/stock-preview/kho-xe-mau-21-toi-dang-giu.png'))
    js('detailTab="logs";renderDetail()');assert driver.find_elements(By.CLASS_NAME,'log-entry')
    js('detailTab="specs";renderDetail();document.getElementById("vin-detail").scrollTop=10000')
    driver.save_screenshot(str(root/'output/stock-preview/kho-xe-mau-21-tac-nghiep.png'))
    assert js('return document.documentElement.scrollWidth<=innerWidth')
    js('mode="staff";holdQuota=1')
    assert not js('return guard(stock[2],"hold")')
    js('mode="admin"');assert js('return guard(stock[2],"hold")')
    js('mode="staff";holdQuota=3')
    js('window.originalBlobURL=URL.createObjectURL;window.originalLinkClick=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{window.exportBlob=b;return window.originalBlobURL(b)};HTMLAnchorElement.prototype.click=function(){}')
    driver.find_element(By.ID,'close-drawer').click()
    driver.find_element(By.ID,'export-demo').click()
    csv=driver.execute_async_script('const done=arguments[0];window.exportBlob.text().then(done)')
    prefix=driver.execute_async_script('const done=arguments[0];window.exportBlob.arrayBuffer().then(b=>done(Array.from(new Uint8Array(b).slice(0,3))))')
    assert prefix==[239,187,191], prefix
    assert len(csv.splitlines())==26, repr(csv[:150])
    assert '24-09-26 TT-OTO-835257/2026/COC' in csv
    js('URL.createObjectURL=window.originalBlobURL;HTMLAnchorElement.prototype.click=window.originalLinkClick')
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1366,'height':900,'deviceScaleFactor':1,'mobile':False})
    driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
    driver.execute_script('arguments[0].scrollIntoView({block:"center"})',driver.find_element(By.CSS_SELECTOR,'.group-more[data-open-model="VF 6"]'))
    driver.find_element(By.CSS_SELECTOR,'.group-more[data-open-model="VF 6"]').click()
    assert js('return document.documentElement.scrollWidth<=innerWidth')
    assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
    print('PASS: 25 vehicles / VF6 20 VIN; 18 detail fields; queue join/leave; 24h hold/release and Sunday extension; quotas/admin bypass; persistence; extension approval; match/swap requests; FIFO; edit validation; delete; read-only/GPS; filters; reset; logs; 26 CSV lines with BOM/full COC; 1908/1366 widths; screenshots; no browser errors.')
finally:
    driver.quit()
