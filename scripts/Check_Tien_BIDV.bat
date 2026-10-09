@echo off
chcp 65001 >nul
title TIỆN ÍCH CHECK TIỀN & XUẤT BÁO CÓ BIDV ➔ ZALO
cls
echo ======================================================================
echo          ⚡ TIỆN ÍCH CHECK TIỀN & XUẤT BÁO CÓ BIDV ➔ ZALO ⚡
echo ======================================================================
echo.
echo  [1] Mo trang cai dat Nut 1-Click tren Chrome (Keo tha vao Bookmark)
echo  [2] Mo truc tiep trang Lich su giao dich BIDV iBank
echo.
echo ======================================================================
echo.
set /p opt="Chon tuy chon (Bam 1 hoac bam Enter): "

if "%opt%"=="2" (
    start "" "https://bidv.vn/iBank/MainEB.html?transaction=OnlineAccountInquiry&method=main"
    exit
)

start "" "%~dp0cai_dat_bookmarklet_baoco.html"
exit
