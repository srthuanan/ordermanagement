from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

root=Path(__file__).resolve().parents[2]
options=webdriver.ChromeOptions()
options.add_argument('--headless=new')
options.add_argument('--allow-file-access-from-files')
options.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=options)
def wait_images():
    driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    for n in ['17','18','19']:
        driver.get((root/('public/previews/kho-xe-mau-'+n+'.html')).as_uri())
        wait_images()
        assert len(driver.find_elements(By.CSS_SELECTOR,'.photo-card'))==8
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-car-action="detail"]'))==8
        holds=driver.find_elements(By.CSS_SELECTOR,'[data-car-action="hold"]')
        assert len(holds)==8 and sum(b.is_enabled() for b in holds)==4
        driver.find_element(By.CSS_SELECTOR,'[data-index="1"] img').click()
        assert driver.execute_script('return selected')==1
        driver.find_element(By.CSS_SELECTOR,'[data-car="0"][data-car-action="hold"]').click()
        assert driver.execute_script('return selected')==1
        assert 'RLLVAGND7TH836455' in driver.find_element(By.ID,'toast').text
        driver.find_element(By.CSS_SELECTOR,'[data-car="1"][data-car-action="detail"]').click()
        assert 'RLLVAGAB9TH802319' in driver.find_element(By.ID,'toast').text
        driver.find_element(By.ID,'search').send_keys('VF 6')
        assert len(driver.find_elements(By.CSS_SELECTOR,'.photo-card'))==2
        driver.execute_script('document.getElementById("search").value="";photoQuery="";selected=0;renderList();document.getElementById("toast").hidden=true;document.activeElement.blur()')
        wait_images()
        assert driver.execute_script('return Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
        assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
        driver.save_screenshot(str(root/('output/stock-preview/kho-xe-mau-'+n+'.png')))
        assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
        print('PASS '+n+': 8 images; 8 per-car detail and hold actions; 4 eligible holds; correct VIN in actions; action click preserves selection; image selection; search; screenshot.')
finally:
    driver.quit()
