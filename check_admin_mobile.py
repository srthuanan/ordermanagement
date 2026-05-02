import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        # iPhone 16 Pro Max viewport: 440 x 956
        browser = await p.chromium.launch(headless=True)
        
        # Emulate iPhone 16 Pro Max
        context = await browser.new_context(
            viewport={'width': 440, 'height': 956},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        
        page = await context.new_page()
        url = "http://localhost:5173/ordermanagement/"
        print(f"Navigating to {url}...")
        await page.goto(url)
        
        try:
            # 1. Login
            print("Waiting for login form...")
            await page.wait_for_selector("input", timeout=10000)
            print("Logging in as admin...")
            await page.get_by_placeholder("example@gmail.com").fill("showroomthuanan@gmail.com")
            await page.locator("input[type='password']").fill("Nhan@1176411")
            await page.get_by_role("button", name="ĐĂNG NHẬP").click()
            
            # 2. Wait for App to load
            print("Waiting for BottomNav...")
            # Wait for the mobile bottom nav specifically
            await page.wait_for_selector("div.fixed.bottom-0", timeout=15000)
            
            # Close any initial popups/modals
            await asyncio.sleep(2)
            await page.keyboard.press("Escape")
            
            # 3. Click Admin tab in BottomNav
            print("Clicking Admin tab in BottomNav...")
            # Find the button that is visible and contains 'Admin'
            admin_btn = page.locator("button:visible:has-text('Admin')")
            if await admin_btn.count() > 0:
                await admin_btn.first.click()
                print("Admin tab clicked.")
            else:
                # Try clicking by index if text fails (Admin is usually last)
                await page.locator("div.fixed.bottom-0 button").last.click()
                print("Clicked last button in bottom nav as fallback.")
            
            await asyncio.sleep(3) # Wait for Admin content to render
            
            # 4. Capture Admin Dashboard
            print("Capturing Admin Dashboard...")
            await page.screenshot(path=os.path.abspath("admin_main_tab_mobile.png"))
            
            # 5. Switch to SYSTEM (HỆ THỐNG) category
            print("Switching to SYSTEM category...")
            system_cat = page.locator("button:visible:has-text('HỆ THỐNG')")
            if await system_cat.count() > 0:
                await system_cat.first.click()
                await asyncio.sleep(1)
                await page.screenshot(path=os.path.abspath("admin_system_category_mobile.png"))
                
                # 6. Click on PHÒNG KD sub-tab
                print("Clicking PHÒNG KD sub-tab...")
                team_tab = page.locator("button:visible:has-text('PHÒNG KD')")
                if await team_tab.count() > 0:
                    await team_tab.first.click()
                    await asyncio.sleep(1)
                    await page.screenshot(path=os.path.abspath("admin_team_management_mobile.png"))
            
            print("Automation completed successfully.")
            
        except Exception as e:
            print(f"Error during automation: {e}")
            await page.screenshot(path=os.path.abspath("admin_error_mobile.png"))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
