from pathlib import Path
import runpy
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

root=Path(__file__).resolve().parents[2]
opt=webdriver.ChromeOptions()
opt.add_argument('--headless=new')
opt.add_argument('--allow-file-access-from-files')
opt.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=opt)
try:
    driver.get((root/'public/previews/kho-xe-mau-21.html').as_uri())
    driver.find_element(By.ID,'reset-demo').click()
    for width,height,zoom in [(1908,1100,1),(1536,790,1),(1366,768,1),(1280,650,1),(1536,790,1.25)]:
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':int(width/zoom),'height':int(height/zoom),'deviceScaleFactor':zoom,'mobile':False})
        driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
        clipped=driver.execute_script('''return Array.from(document.querySelectorAll('.group-card')).flatMap(card=>{const bounds=card.getBoundingClientRect();return Array.from(card.querySelectorAll('button')).filter(b=>{const r=b.getBoundingClientRect();return r.bottom>bounds.bottom+1||r.top<bounds.top-1||r.right>bounds.right+1||r.left<bounds.left-1}).map(b=>b.textContent.trim())})''')
        assert not clipped,(width,height,zoom,clipped)
        more=driver.find_element(By.CSS_SELECTOR,'.group-more[data-open-model="VF 6"]')
        more.click()
        assert len(driver.find_elements(By.CSS_SELECTOR,'.list-vin'))==20
        driver.find_element(By.ID,'close-drawer').click()
        queue=driver.find_element(By.CSS_SELECTOR,'#stock-gallery [data-action="queue"][data-vin="RLLVAG8C5TH835257"]')
        queue.click();assert driver.find_element(By.ID,'action-dialog').is_displayed()
        driver.find_element(By.ID,'cancel-action').click()
        hold=driver.find_element(By.CSS_SELECTOR,'#stock-gallery [data-action="hold"][data-vin="RLLVAG8C5TH835259"]')
        hold.click();driver.find_element(By.ID,'confirm-action').click()
        assert driver.execute_script('return getVIN("RLLVAG8C5TH835259").holder===USER')
        release=driver.find_element(By.CSS_SELECTOR,'#stock-gallery [data-action="release"][data-vin="RLLVAG8C5TH835259"]')
        release.click();driver.find_element(By.ID,'confirm-action').click()
        assert driver.execute_script('return getVIN("RLLVAG8C5TH835259").status')=='Chưa ghép'
        bottom=driver.find_elements(By.CSS_SELECTOR,'.group-more')[-1]
        bottom.click();assert driver.find_element(By.ID,'drawer-overlay').is_displayed()
        driver.find_element(By.ID,'close-drawer').click()
        driver.execute_script('document.getElementById("toast").hidden=true;document.getElementById("stock-gallery").scrollTop=0;document.activeElement.blur()')
        if (width,height,zoom)==(1536,790,1):
            driver.save_screenshot(str(root/'output/stock-preview/kho-xe-mau-21-sua-khung.png'))
        print(f'PASS {width}x{height}, zoom {zoom}: no clipped card controls; real clicks open 20 VIN, queue dialog, hold/release, last group.')
    assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
finally:
    driver.quit()
runpy.run_path(str(root/'output/stock-preview/check-functional-demo.py'))
