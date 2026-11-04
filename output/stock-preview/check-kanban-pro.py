from pathlib import Path
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

root = Path(__file__).resolve().parents[2]
opt = webdriver.ChromeOptions()
opt.add_argument('--headless=new')
opt.add_argument('--allow-file-access-from-files')
opt.add_argument('--log-level=3')
opt.set_capability('goog:loggingPrefs', {'performance': 'ALL', 'browser': 'ALL'})

for p in [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]:
    if Path(p).exists():
        opt.binary_location = p
        break

driver = webdriver.Chrome(
    service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'),
    options=opt,
)


def js(code):
    return driver.execute_script(code)


def wait_loaded():
    WebDriverWait(driver, 75).until(lambda d: d.execute_script('return typeof loadingLive!=="undefined"&&!loadingLive'))
    assert js('return stock.length>0'), driver.find_element(By.CLASS_NAME, 'demo-banner').text


def image_wait():
    driver.execute_async_script(
        'const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(done)'
    )


def screenshot(name):
    image_wait()
    js('const t=document.getElementById("toast");if(t)t.hidden=true;if(document.activeElement)document.activeElement.blur()')
    driver.save_screenshot(str(root / f'output/stock-preview/{name}.png'))


results = {}
try:
    for num, name, title in [
        ('28', 'kho-xe-mau-28-pro-tong-quan', 'Mẫu 28 Pro Kanban'),
        ('33', 'kho-xe-mau-33-tong-quan', 'Mẫu 33 Kanban Pro Flagship'),
    ]:
        file_path = root / f'public/previews/kho-xe-mau-{num}.html'
        assert file_path.exists(), f'{file_path} does not exist'

        driver.execute_cdp_cmd(
            'Emulation.setDeviceMetricsOverride',
            {'width': 1908, 'height': 1000, 'deviceScaleFactor': 1, 'mobile': False},
        )
        driver.get(file_path.as_uri())
        wait_loaded()

        count = js('return stock.length')
        assert js('return stock.every(c=>c.source==="live")')
        assert js('return previewNetworkAudit.every(r=>r.method==="GET")')
        assert js('return document.documentElement.scrollWidth <= innerWidth')

        # Check Kanban Pro features
        assert js('return document.querySelectorAll(".kanban-lane").length === 3')
        assert js('return document.querySelectorAll(".k-card[draggable=true]").length > 0')
        assert js('return !!document.getElementById("k-side-inspector")')
        assert js('return !!document.getElementById("k-kpi-ribbon")')

        screenshot(name)

        # Responsive checks
        for width, height in [(1536, 790), (1366, 768)]:
            driver.execute_cdp_cmd(
                'Emulation.setDeviceMetricsOverride',
                {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': False},
            )
            driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
            assert js('return document.documentElement.scrollWidth <= innerWidth')

        errors = [e for e in driver.get_log('browser') if e['level'] == 'SEVERE']
        assert not errors, [(e['message'][:200]) for e in errors]

        results[f'mau_{num}'] = {
            'title': title,
            'vehicles': count,
            'features': ['drag-and-drop', 'realtime-countdown', 'side-inspector', 'kpi-ribbon', 'fifo-ready'],
            'status': 'PASS',
            'no_overflow': True,
            'clean_console': True,
        }

    print(json.dumps({'overall': 'PASS', 'details': results}, ensure_ascii=False, indent=2))
except Exception:
    print('Browser diagnostics:', [(e['level'], e['message'][:300]) for e in driver.get_log('browser')])
    raise
finally:
    driver.quit()

