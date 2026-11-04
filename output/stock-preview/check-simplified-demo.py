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
def field(name,value):
    el=driver.find_element(By.CSS_SELECTOR,f'#action-form [name="{name}"]');el.clear();el.send_keys(value)
def confirm():driver.find_element(By.ID,'confirm-action').click()
def vid(i):return js(f'return stock[{i}].vin')
def open_list():driver.find_element(By.CSS_SELECTOR,'.group-select[data-open-model="VF 6"]').click()
def primary(i,action):driver.find_element(By.CSS_SELECTOR,f'.simple-row[data-select-vin="{vid(i)}"] [data-action="{action}"]').click()
def more(i,action):
    driver.find_element(By.CSS_SELECTOR,f'[data-more-vin="{vid(i)}"]').click()
    driver.find_element(By.CSS_SELECTOR,f'#vin-actions-menu [data-menu-action="{action}"]').click()
def role(value):Select(driver.find_element(By.ID,'role')).select_by_value(value)
def screenshot(name):
    driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
    js('document.getElementById("toast").hidden=true;document.activeElement.blur()')
    driver.save_screenshot(str(root/('output/stock-preview/kho-xe-mau-22-'+name+'.png')))
try:
    driver.get((root/'public/previews/kho-xe-mau-22.html').as_uri())
    driver.find_element(By.ID,'reset-demo').click()
    for width,height in [(1908,1000),(1536,790),(1366,768),(1280,650)]:
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False})
        driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
        assert len(driver.find_elements(By.CLASS_NAME,'group-card'))==6
        assert not driver.find_elements(By.CSS_SELECTOR,'.group-card [data-action]')
        assert not js('return Array.from(document.querySelectorAll(".group-card")).some(c=>c.scrollHeight>c.clientHeight+1)')
        open_list()
        assert len(driver.find_elements(By.CLASS_NAME,'simple-row'))==20
        assert all(len(r.find_elements(By.CSS_SELECTOR,'[data-action]'))<=1 for r in driver.find_elements(By.CLASS_NAME,'simple-row'))
        assert not driver.find_element(By.ID,'vin-detail').is_displayed()
        primary(2,'hold');confirm()
        assert js('return stock[2].holder===USER')
        more(2,'release');confirm();assert js('return stock[2].status')=='Chưa ghép'
        driver.find_element(By.CSS_SELECTOR,f'[data-show-vin="{vid(0)}"]').click()
        assert driver.find_element(By.ID,'vin-detail').is_displayed()
        assert not driver.find_element(By.ID,'vin-list').is_displayed()
        assert len(driver.find_elements(By.CSS_SELECTOR,'.field-row'))==18
        driver.find_element(By.ID,'back-to-list').click()
        driver.find_element(By.ID,'close-drawer').click()
        assert js('return document.documentElement.scrollWidth<=innerWidth')
        print(f'PASS {width}x{height}: 6 clean cards, 20 VIN rows, 1 primary action per VIN, hold/release, separate detail/back, no clipped cards.')
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    driver.find_element(By.ID,'reset-demo').click()
    screenshot('tong-quan')
    open_list();screenshot('danh-sach-vin')
    primary(0,'queue');confirm();assert js('return stock[0].queue.includes(USER)')
    primary(0,'leave');confirm();assert not js('return stock[0].queue.includes(USER)')
    more(1,'extend');field('reason','Hoàn tất hồ sơ khách hàng');confirm();assert js('return stock[1].extension')
    role('admin');more(1,'approve-extension');confirm();assert not js('return stock[1].extension')
    role('staff');primary(1,'match');field('customer','TRẦN VĂN LỢI');field('order','DEMO-VSO-022');confirm();assert js('return stock[1].request.order')=='DEMO-VSO-022'
    more(14,'swap');field('reason','Khách chọn VIN khác cùng cấu hình');confirm();assert 'Đề nghị đổi' in js('return stock[14].logs[0].text')
    role('admin');more(0,'release');confirm();assert js('return stock[0].holder')=='TRẦN THỊ NGỌC HÀ'
    more(2,'edit');field('vin','BAD');confirm();assert driver.find_element(By.ID,'modal-error').text
    field('vin',vid(2));field('coc','COC-FULL-2026-DEMO-22-0000000001');confirm();assert js('return stock[2].coc')=='COC-FULL-2026-DEMO-22-0000000001'
    more(2,'delete');field('reason','Kiểm tra xóa bản ghi mẫu');confirm();assert js('return stock.length')==24
    role('readonly');assert not driver.find_elements(By.CSS_SELECTOR,'.simple-row [data-action]')
    more(2,'map');assert driver.find_element(By.CLASS_NAME,'map-schematic').is_displayed();confirm()
    more(1,'logs');assert driver.find_elements(By.CLASS_NAME,'log-entry')
    driver.find_element(By.ID,'back-to-list').click()
    role('staff')
    driver.find_element(By.ID,'drawer-search').send_keys('835257');assert len(driver.find_elements(By.CLASS_NAME,'simple-row'))==1
    js('document.getElementById("drawer-search").value="";drawerSearch="";renderDrawer()')
    Select(driver.find_element(By.ID,'drawer-status')).select_by_visible_text('Đã ghép');assert len(driver.find_elements(By.CLASS_NAME,'simple-row'))==5
    Select(driver.find_element(By.ID,'drawer-status')).select_by_index(0)
    driver.find_element(By.ID,'close-drawer').click()
    driver.find_element(By.ID,'reset-demo').click();open_list()
    driver.find_element(By.CSS_SELECTOR,f'[data-show-vin="{vid(0)}"]').click()
    assert '24-09-26 TT-OTO-835257/2026/COC' in driver.find_element(By.ID,'vin-detail').text
    screenshot('chi-tiet')
    driver.find_element(By.ID,'back-to-list').click()
    driver.find_element(By.CSS_SELECTOR,f'[data-more-vin="{vid(1)}"]').click()
    screenshot('thao-tac-phu')
    driver.find_element(By.CSS_SELECTOR,'#vin-actions-menu [data-menu-action="detail"]').click()
    assert driver.find_element(By.ID,'vin-detail').is_displayed()
    assert js('return document.documentElement.scrollWidth<=innerWidth')
    assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
    print('PASS workflows: queue/leave, extension/approval, match request, compatible swap request, admin FIFO release, edit validation, delete reason, read-only/GPS, history, filters, reset, full COC, separate detail view, per-VIN overflow menus, screenshots, no browser errors.')
finally:
    driver.quit()
