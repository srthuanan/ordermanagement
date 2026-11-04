from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

root=Path(__file__).resolve().parents[2]
options=webdriver.ChromeOptions()
options.add_argument('--headless=new')
options.add_argument('--allow-file-access-from-files')
options.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=options)
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    driver.get((root/'public/previews/kho-xe-mau-20.html').as_uri())
    assert len(driver.find_elements(By.CSS_SELECTOR,'.hybrid-shelf'))==6
    assert len(driver.find_elements(By.CSS_SELECTOR,'.hybrid-vehicle'))==8
    holds=driver.find_elements(By.CSS_SELECTOR,'[data-car-action="hold"]')
    assert len(holds)==8 and sum(b.is_enabled() for b in holds)==4
    driver.find_element(By.CSS_SELECTOR,'[data-pick="1"] img').click()
    assert driver.execute_script('return selected')==1
    driver.find_element(By.CSS_SELECTOR,'[data-car="0"][data-car-action="hold"]').click()
    assert driver.execute_script('return selected')==1
    assert 'RLLVAGND7TH836455' in driver.find_element(By.ID,'toast').text
    driver.find_element(By.CSS_SELECTOR,'[data-car="1"][data-car-action="detail"]').click()
    assert 'RLLVAGAB9TH802319' in driver.find_element(By.ID,'toast').text
    driver.find_element(By.ID,'search').send_keys('VF 6')
    assert len(driver.find_elements(By.CSS_SELECTOR,'.hybrid-shelf'))==1
    assert len(driver.find_elements(By.CSS_SELECTOR,'.hybrid-vehicle'))==2
    driver.execute_script('document.getElementById("search").value="";photoQuery="";renderList()')
    Select(driver.find_element(By.ID,'photo-model')).select_by_visible_text('VF 5')
    assert len(driver.find_elements(By.CSS_SELECTOR,'.hybrid-vehicle'))==2
    Select(driver.find_element(By.ID,'photo-model')).select_by_index(0)
    driver.execute_script('selected=0;renderList();document.getElementById("toast").hidden=true;document.activeElement.blur()')
    driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
    assert driver.execute_script('return Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
    assert driver.execute_script('return Array.from(document.querySelectorAll(".hybrid-shelf")).every(s=>s.scrollHeight<=s.clientHeight+1)')
    assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
    driver.save_screenshot(str(root/'output/stock-preview/kho-xe-mau-20.png'))
    assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
    print('PASS: 6 model groups, 8 VIN rows, image selection, 8 local actions, 4 eligible holds, correct VIN, search/model filters, images, no card/page overflow, no console errors; screenshot 1908x1000')
finally:
    driver.quit()
