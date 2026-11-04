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
def wait_images():
    driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    for n in ['12','13','14','15','16']:
        driver.get((root/('public/previews/kho-xe-mau-'+n+'.html')).as_uri())
        wait_images()
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-index]'))==8
        assert driver.execute_script('return Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
        driver.find_element(By.ID,'search').send_keys('VF 6')
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-index]'))==2
        driver.execute_script('document.getElementById("search").value="";photoQuery="";renderList()')
        driver.find_element(By.CSS_SELECTOR,'[data-index="1"]').click()
        assert driver.find_element(By.ID,'model').text=='VF 3'
        Select(driver.find_element(By.ID,'photo-model')).select_by_visible_text('VF 5')
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-index]'))==2
        Select(driver.find_element(By.ID,'photo-model')).select_by_index(0)
        driver.find_element(By.CSS_SELECTOR,'[data-status="'+driver.execute_script('return cars[1].status')+'"]').click()
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-index]'))==2
        driver.find_element(By.CSS_SELECTOR,'[data-status=""]').click()
        driver.find_element(By.CSS_SELECTOR,'[data-index="0"]').click()
        wait_images()
        if n!='16':
            driver.find_element(By.CSS_SELECTOR,'[data-index="1"] img').click()
            assert driver.find_element(By.ID,'model').text=='VF 3'
            driver.find_element(By.CSS_SELECTOR,'[data-index="0"] img').click()
        else:
            driver.find_element(By.CSS_SELECTOR,'[data-pick="1"] img').click()
            assert driver.find_element(By.ID,'model').text=='VF 3'
            driver.find_element(By.CSS_SELECTOR,'[data-index="0"]').click()
        wait_images()
        driver.execute_script('document.activeElement.blur();document.getElementById("gallery").scrollTop=0;window.scrollTo(0,0)')
        assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight')
        driver.save_screenshot(str(root/('output/stock-preview/kho-xe-mau-'+n+'.png')))
        assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
        print('PASS '+n+': 8 cars, images loaded, click image to select, VIN selection, search, model/status filters, viewport, console; screenshot 1908x1000')
finally:
    driver.quit()
