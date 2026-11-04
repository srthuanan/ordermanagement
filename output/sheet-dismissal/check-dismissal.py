from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

root=Path(__file__).resolve().parents[2]
opt=webdriver.ChromeOptions()
opt.add_argument('--headless=new')
opt.add_argument('--allow-file-access-from-files')
opt.add_argument('--log-level=3')
driver=webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),options=opt)
def js(code):return driver.execute_script(code)
def click_xy(x,y):
    for event in ['mousePressed','mouseReleased']:
        driver.execute_cdp_cmd('Input.dispatchMouseEvent',{'type':event,'x':x,'y':y,'button':'left','clickCount':1})
def opened():return js('return document.getElementById("notification-sheet")?.open===true')
def wait_close():
    WebDriverWait(driver,5).until(lambda d:not opened())
    driver.execute_async_script('const done=arguments[0];setTimeout(done,300)')
    assert not opened(),'Sheet reopened after the backdrop click.'
try:
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1400,'height':900,'deviceScaleFactor':1,'mobile':False})
    driver.get((root/'output/sheet-dismissal/preview.html').as_uri())
    bell=WebDriverWait(driver,15).until(lambda d:d.find_element(By.CSS_SELECTOR,'button[aria-controls="notification-sheet"]'))
    for _ in range(3):
        bell.click();WebDriverWait(driver,5).until(lambda d:opened())
        driver.find_element(By.CLASS_NAME,'notification-sheet-heading').click()
        assert opened(),'Internal whitespace closed the sheet.'
        driver.find_element(By.CLASS_NAME,'notification-sheet-item').click()
        assert opened(),'Notification content clicked through to the backdrop.'
        click_xy(1100,400);wait_close()
    bell.click();WebDriverWait(driver,5).until(lambda d:opened())
    driver.find_element(By.CSS_SELECTOR,'button[aria-label="Đóng thông báo"]').click();wait_close()
    bell.click();WebDriverWait(driver,5).until(lambda d:opened())
    driver.find_element(By.ID,'notification-sheet').send_keys(Keys.ESCAPE);wait_close()
    assert 'background-action' not in js('return window.sheetReviewEvents')
    driver.find_element(By.ID,'open-tabs').click()
    WebDriverWait(driver,5).until(lambda d:d.find_element(By.CLASS_NAME,'mt-sheet-panel').is_displayed())
    driver.find_element(By.CLASS_NAME,'mt-title').click();assert js('return window.sheetReviewState.tabs')
    panel=driver.find_element(By.CLASS_NAME,'mt-sheet-panel').rect
    click_xy(panel['x']+panel['width']+40 if panel['x']<700 else panel['x']-40,400)
    WebDriverWait(driver,5).until(lambda d:not js('return window.sheetReviewState.tabs'))
    driver.find_element(By.ID,'open-request').click()
    WebDriverWait(driver,5).until(lambda d:d.find_element(By.CLASS_NAME,'create-request-sheet').is_displayed())
    driver.find_element(By.ID,'review-customer').send_keys('Khách thử')
    assert js('return window.sheetReviewState.request')
    panel=driver.find_element(By.CLASS_NAME,'create-request-sheet').rect
    click_xy(panel['x']+panel['width']+40 if panel['x']<700 else panel['x']-40,400)
    WebDriverWait(driver,5).until(lambda d:not js('return window.sheetReviewState.request'))
    assert not [e for e in driver.get_log('browser') if e['level']=='SEVERE']
    print('PASS: notification outside click closes and stays closed (3 cycles); inside whitespace/content stay open; X and Escape close; backdrop never clicks underlying button; settings/request sheets dismiss outside and preserve internal interaction; no production APIs.')
except Exception:
    print('Browser diagnostics:',[(e['level'],e['message'][:550]) for e in driver.get_log('browser')])
    raise
finally:
    driver.quit()
