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
try:
    driver.get((root/'output/stock-card-redesign/preview.html').as_uri())
    WebDriverWait(driver,15).until(lambda d:len(d.find_elements(By.CLASS_NAME,'cmd-card'))==9)
    assert len(driver.find_elements(By.CLASS_NAME,'cmd-card-holder'))==4
    assert 'Chưa có người giữ' not in driver.find_element(By.ID,'root').text
    assert driver.find_element(By.CLASS_NAME,'cmd-card-holder-name').text=='ĐÀO MINH KỲ'
    print('PASS: holder label omitted on 5 unheld vehicles; actual holder names remain on 4 held/assigned vehicles.')
    for width,height in [(1908,1000),(1536,790),(1366,768),(1100,750)]:
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False})
        driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
        problems=driver.execute_script('''return Array.from(document.querySelectorAll('.cmd-card')).flatMap(card=>{const box=card.getBoundingClientRect(), model=card.querySelector('.cmd-card-model').getBoundingClientRect(), status=card.querySelector('.cmd-status').getBoundingClientRect();const errors=[];if(model.right>status.left-5)errors.push('model-status overlap');for(const node of card.querySelectorAll('.cmd-card-version,.cmd-card-vin,.cmd-card-color,.cmd-card-specs,.cmd-card-footer,button')){const r=node.getBoundingClientRect();if(r.left<box.left-1||r.right>box.right+1||r.bottom>box.bottom+1)errors.push('clipped '+node.className)}return errors})''')
        assert not problems,(width,problems)
        assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth')
        if width in [1908,1366]:
            driver.execute_async_script('const done=arguments[0];Promise.all(Array.from(document.images).map(i=>i.decode())).then(done)')
            driver.save_screenshot(str(root/f'output/stock-card-redesign/cards-{width}.png'))
        print(f'PASS {width}: long model versions do not overlap status, VIN/specs/footer/actions stay inside cards.')
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':1908,'height':1000,'deviceScaleFactor':1,'mobile':False})
    driver.execute_async_script('const done=arguments[0];requestAnimationFrame(()=>requestAnimationFrame(done))')
    cards=driver.find_elements(By.CLASS_NAME,'cmd-card')
    cards[0].find_element(By.CSS_SELECTOR,'.cmd-btn.primary').click()
    assert driver.execute_script('return window.stockReviewEvents.at(-1).action')=='hold'
    cards[4].find_element(By.CSS_SELECTOR,'button[title="Hủy giữ xe (nhả xe về kho)"]').click()
    assert driver.execute_script('return window.stockReviewEvents.at(-1).action')=='release'
    cards[5].find_element(By.CSS_SELECTOR,'button[title="Đăng ký chờ khi xe được nhả"]').click()
    assert driver.execute_script('return window.stockReviewEvents.at(-1).action')=='queue'
    cards[2].find_element(By.CLASS_NAME,'cmd-card-vin').click()
    WebDriverWait(driver,5).until(lambda d:d.find_element(By.CLASS_NAME,'cmd-drawer').is_displayed())
    assert 'Plus_Metal Tiêu chuẩn 2 (1 Cầu)' in driver.find_element(By.CLASS_NAME,'cmd-drawer').text
    driver.find_element(By.CLASS_NAME,'cmd-drawer-close').click()
    assert not driver.find_elements(By.CLASS_NAME,'cmd-drawer')
    orders_css=(root/'components/orders/orders-premium.css').read_text(encoding='utf-8')
    driver.execute_script('''const style=document.createElement('style');style.textContent=arguments[0];document.head.append(style);const ref=document.createElement('div');ref.className='premium-orders';ref.id='orders-heading-reference';ref.style.cssText='position:fixed;left:-9999px;top:0;width:390px;display:block;height:250px';ref.innerHTML='<aside class="premium-orders-sidebar"><div class="premium-list-heading"><h1>Đơn hàng <span>66</span></h1><div><button></button></div></div><div class="premium-list-search"><label><input placeholder="Tìm khách hàng, mã đơn, VIN…"></label></div></aside>';document.body.append(ref)''',orders_css)
    differences=driver.execute_script('''const pairs=[['.cmd-sidebar-head','#orders-heading-reference .premium-list-heading',['paddingTop','paddingBottom','paddingLeft','paddingRight','height','gap']],['.cmd-sidebar-head h1','#orders-heading-reference h1',['fontSize','fontWeight','fontFamily','letterSpacing','lineHeight','color']],['.cmd-sidebar-head h1 span','#orders-heading-reference h1 span',['fontSize','fontWeight','marginLeft','letterSpacing','color']],['.cmd-search-wrap','#orders-heading-reference .premium-list-search',['paddingTop','paddingBottom','paddingLeft','paddingRight','gap']],['.cmd-search-label','#orders-heading-reference label',['height','borderRadius','paddingLeft','paddingRight','gap']]];return pairs.flatMap(([a,b,keys])=>{const x=getComputedStyle(document.querySelector(a)),y=getComputedStyle(document.querySelector(b));return keys.filter(k=>x[k]!==y[k]).map(k=>[a,k,x[k],y[k]])})''')
    assert not differences,differences
    print('PASS: stock heading, count, header height/padding, font, and search dimensions equal the actual Orders CSS computed in the same browser.')
    errors=[e['message'][:240] for e in driver.get_log('browser') if e['level']=='SEVERE']
    assert not errors,errors
    print('PASS: actual StockView hold/release/queue callbacks and VIN detail open/close; all executed in isolated preview with no production API.')
except Exception:
    print('Browser diagnostics:',[(e['level'],e['message'][:500]) for e in driver.get_log('browser')])
    raise
finally:
    driver.quit()
