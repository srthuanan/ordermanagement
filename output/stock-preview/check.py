from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

root = Path(__file__).resolve().parents[2]
options = webdriver.ChromeOptions()
options.add_argument('--headless=new')
options.add_argument('--window-size=1908,1000')
options.add_argument('--allow-file-access-from-files')
options.add_argument('--log-level=3')
driver = webdriver.Chrome(service=Service('C:/Users/Pham Thanh Nhan/.cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe'), options=options)
try:
    driver.get((root / 'public/previews/kho-xe.html').as_uri())
    assert len(driver.find_elements(By.CSS_SELECTOR, '.vehicle')) == 8
    assert driver.execute_script('return photo.complete && photo.naturalWidth > 0')
    search = driver.find_element(By.ID, 'search')
    search.send_keys('VF 6')
    assert len(driver.find_elements(By.CSS_SELECTOR, '.vehicle')) == 2
    search.clear()
    search.send_keys('zzzz')
    assert driver.find_element(By.CLASS_NAME, 'empty').is_displayed()
    driver.execute_script('document.getElementById("search").value="";renderList()')
    driver.find_element(By.ID, 'filter').click()
    Select(driver.find_element(By.ID, 'statusFilter')).select_by_index(2)
    assert len(driver.find_elements(By.CSS_SELECTOR, '.vehicle')) == 2
    driver.find_element(By.CSS_SELECTOR, '.vehicle').click()
    assert driver.find_element(By.ID, 'model').text == 'VF 3'
    assert not driver.find_element(By.ID, 'hold').is_enabled()
    driver.find_element(By.ID, 'tab-log').click()
    assert len(driver.find_elements(By.CSS_SELECTOR, '.event')) == 4
    Select(driver.find_element(By.ID, 'statusFilter')).select_by_index(0)
    driver.find_element(By.ID, 'filter').click()
    driver.find_element(By.CSS_SELECTOR, '.vehicle').click()
    driver.find_element(By.ID, 'tab-progress').click()
    driver.find_element(By.ID, 'hold').click()
    assert driver.find_element(By.ID, 'toast').is_displayed()
    driver.execute_script('document.getElementById("toast").hidden=true')
    assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth')
    driver.execute_script('document.querySelector("main").scrollTop=0;window.scrollTo(0,0)')
    driver.save_screenshot(str(root / 'output/stock-preview/kho-xe-desktop.png'))
    driver.set_window_size(1366, 900)
    assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth')
    driver.save_screenshot(str(root / 'output/stock-preview/kho-xe-laptop.png'))
    errors = [e for e in driver.get_log('browser') if e['level'] == 'SEVERE']
    assert not errors, errors
    print('PASS: image, search, empty state, filter, selection, restricted hold, tabs, demo feedback, desktop/laptop overflow, browser console.')
finally:
    driver.quit()
