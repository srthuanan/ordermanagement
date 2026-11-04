from pathlib import Path
import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

root=Path(__file__).resolve().parents[2]
options=webdriver.ChromeOptions()
options.add_argument('--headless=new')
options.add_argument('--allow-file-access-from-files')
options.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=options)
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    for number in (sys.argv[1:] or ['01','02','03']):
        driver.get((root/('public/previews/kho-xe-mau-'+number+'.html')).as_uri())
        driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
        assert driver.execute_script('return Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-index]'))==8
        assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth')
        assert driver.execute_script('return document.querySelector("main").scrollHeight<=document.querySelector("main").clientHeight+1'), 'Main content overflows '+number
        driver.find_element(By.ID,'search').send_keys('VF 6')
        assert len(driver.find_elements(By.CSS_SELECTOR,'[data-index]'))==2
        driver.execute_script('document.getElementById("search").value="";renderList()')
        driver.find_element(By.CSS_SELECTOR,'[data-index="1"]').click()
        assert driver.find_element(By.ID,'model').text=='VF 3'
        driver.find_element(By.CSS_SELECTOR,'[data-index="0"]').click()
        driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)')
        driver.execute_script('document.querySelector("main").scrollTop=0;document.getElementById("list").scrollTop=0;window.scrollTo(0,0)')
        driver.save_screenshot(str(root/('output/stock-preview/kho-xe-mau-'+number+'.png')))
        assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
        print('PASS: variant '+number+'; 8 vehicles, images, search, selection, no overflow, no browser errors; screenshot 1908x1000.')
finally:
    driver.quit()
