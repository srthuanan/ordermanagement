from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

root=Path(__file__).resolve().parents[2]
opt=webdriver.ChromeOptions()
opt.add_argument('--headless=new')
opt.add_argument('--allow-file-access-from-files')
opt.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=opt)
def js(code,*args):return driver.execute_script(code,*args)
def frame():driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
def vins():return js('return Array.from(document.querySelectorAll(".cmd-card")).map(c=>c.dataset.stockVin)')
def card(vin):return driver.find_element(By.CSS_SELECTOR,f'[data-stock-vin="{vin}"]')
def status_filter(value):driver.find_element(By.XPATH,f'//div[contains(@class,"facet-group")][1]//button[span[normalize-space()="{value}"]]').click();frame()
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1100,'height':650,'deviceScaleFactor':1,'mobile':False})
    driver.get((root/'output/stock-card-redesign/preview.html').as_uri())
    WebDriverWait(driver,15).until(lambda d:len(d.find_elements(By.CLASS_NAME,'cmd-card'))==9)
    initial=vins()
    js('window.updateStockReviewData(prev=>[...prev].reverse())');frame()
    assert vins()==initial
    status_filter('Chưa ghép')
    filtered=vins();assert len(filtered)==5
    target=filtered[-1]
    button=card(target).find_element(By.CSS_SELECTOR,'.cmd-btn.primary')
    js('arguments[0].scrollIntoView({block:"center"})',button);frame()
    before=card(target).rect['y']
    button.click();frame()
    assert vins()==filtered,'Holding a vehicle changed its order or removed it from the active filter.'
    assert card(target).find_element(By.CLASS_NAME,'cmd-status').text=='Đang giữ'
    assert abs(card(target).rect['y']-before)<=1,(before,card(target).rect['y'])
    # A second revalidation can reorder the source again without moving the visible card.
    js('window.updateStockReviewData(prev=>[...prev].reverse())');frame()
    assert vins()==filtered
    assert abs(card(target).rect['y']-before)<=1
    # Manual scrolling sets the next anchor rather than jumping back to the first click.
    js('document.getElementById("cmd-stream").scrollTop-=60');frame()
    manual=card(target).rect['y']
    js('window.updateStockReviewData(prev=>[...prev].reverse())');frame()
    assert abs(card(target).rect['y']-manual)<=1
    # Releasing while filtering held cars likewise retains the acted-on row.
    status_filter('Đang giữ');held=vins()
    release=card(target).find_element(By.CSS_SELECTOR,'button[title="Hủy giữ xe (nhả xe về kho)"]')
    js('arguments[0].scrollIntoView({block:"center"})',release);frame()
    release_y=card(target).rect['y']
    release.click();frame()
    assert vins()==held
    assert card(target).find_element(By.CLASS_NAME,'cmd-status').text=='Chưa ghép'
    assert abs(card(target).rect['y']-release_y)<=1
    # A deliberate filter change starts a new result set, so the exception is not permanent.
    status_filter('Chưa ghép')
    status_filter('Đang giữ')
    assert target not in vins()
    status_filter('Tất cả trạng thái')
    assert vins()==initial
    # New records append; removed records are not fabricated or retained.
    js('window.updateStockReviewData(prev=>[{...prev[0],VIN:"RLLVAGND7TH999999"},...prev])');frame()
    assert vins()==initial+['RLLVAGND7TH999999']
    js('window.updateStockReviewData(prev=>prev.filter(c=>c.VIN!=="RLLVAGND7TH999999"))');frame()
    assert vins()==initial
    assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
    print('PASS: source reorder preserves VIN order; hold/release remain visible under previous status filter; card Y unchanged within 1px; refetch preserves manual scroll; explicit filter changes reapply rules; new VINs append; removed VINs disappear; no production API.')
except Exception:
    print('Browser diagnostics:',[(e['level'],e['message'][:350]) for e in driver.get_log('browser')])
    raise
finally:
    driver.quit()
