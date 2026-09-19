CREATE PROCEDURE [dbo].[CP_BeXepXe]
	@M_Load [nvarchar](10),
	@M_ALL [nvarchar](10),
	@M_Is_Xep_Xe [nvarchar](1),
	@M_Thang1 [numeric](5, 0),
	@M_Nam1 [numeric](5, 0),
	@M_Thang2 [numeric](5, 0),
	@M_Nam2 [numeric](5, 0),
	@M_Stt_Rec [nvarchar](50),
	@M_Stt_Rec0 [nvarchar](50),
	@M_Ma_KX [nvarchar](50),
	@M_Ma_Mau [nvarchar](50),
	@M_Ma_KH [nvarchar](50),
	@M_Ma_HD [nvarchar](50),
	@M_Nh_HD1 [nvarchar](50),
	@M_Nh_HD2 [nvarchar](50),
	@M_Nh_HD3 [nvarchar](50),
	@M_Ma_DVCS [nvarchar](50),
	@M_User_name [nvarchar](100)
--WITH ENCRYPTION, EXECUTE AS CALLER

AS
BEGIN
	SET NOCOUNT ON;		
	DECLARE @strSQLMAX NVARCHAR(MAX) = '',@Ngay_Ct1 SMALLDATETIME, @Ngay_Ct2 SMALLDATETIME,@Ma_Post NVARCHAR(10) = N'1',@Chk_HD NVARCHAR(1) = N'0'
	,@BackColor NVARCHAR(400) = N'',@So_Khung NVARCHAR(50) = N'',@So_May NVARCHAR(50) = N'',@Ten_KH NVARCHAR(400) = N'',@Dien_THoai NVARCHAR(50)	
	,@Ma NVARCHAR(50) = '',@Ten NVARCHAR(200) = '',@Ngay SMALLDATETIME = '19000101',@Sl NUMERIC(10,0) = 0
	,@Ngay_Dau_Nam SMALLDATETIME = '19000101'
	,@Ngay_HT SMALLDATETIME  = CONVERT(SMALLDATETIME ,CONVERT(NVARCHAR(8),GETDATE(),112))
	--------------------------------------------------------------------------------------------------------------------
	---0: Định nghĩa màu
	SELECT TOP 0 @Ma as Ma_Color,@Ma as BackColor,@Ma as BackColor2,@Ma as ForeColor,@Ten as Ten_Color INTO #Color FROM dbo.Dmct WITH (NOLOCK) WHERE 1=0
	INSERT #Color SELECT '01','Yellow','','',N'QH đặt cọc'
	INSERT #Color SELECT '02','Violet','','',N'Đã xuất HĐ'
	INSERT #Color SELECT '03','Red','','White',N'Hủy'	
	INSERT #Color SELECT '04','GreenYellow','','',N'Chờ duyệt'
	INSERT #Color SELECT '05','Cyan','','',N'Đã ghép SK'
	INSERT #Color SELECT '06','','','',N'Chờ ghép SK'	
	INSERT #Color SELECT '07','Pink','','',N'Thừa xe'	
	INSERT #Color SELECT '08','Brown','','White',N'Thiếu xe'		
	--INSERT #Color SELECT '09','','','',N''	
	--INSERT #Color SELECT '10','','','',N''	
	--------------------------------------------------------------------------------------------------------------------
	---1: Lấy ngày và hợp đồng
	IF @M_Thang1 IS NULL SET @M_Thang1 = 0
	IF @M_Thang1 <> 0
			BEGIN
				SET @Ngay_Ct1 = dbo.CF_Ngay_DauThang(@M_Thang1,@M_Nam1);SET @Ngay_Ct2 =  dbo.CF_Ngay_CuoiThang(@M_Thang2,@M_Nam2);SET @Ngay_Dau_Nam = dbo.CF_Ngay_DauThang(1,@M_Nam1)
			END	
		ELSE
			BEGIN
				SET @Ngay_Ct1 = '19000101';SET @Ngay_Ct2 = '19000101';SET @Ngay_Dau_Nam = '19000101';
			END
	
	IF NOT @M_Ma_HD = N'' SET @Chk_HD = N'1'; IF NOT @M_Nh_HD1 = N'' SET @Chk_HD = N'1'; IF NOT @M_Nh_HD2 = N'' SET @Chk_HD = N'1'; IF NOT @M_Nh_HD3 = N'' SET @Chk_HD = N'1'
	SELECT Ma_HD INTO #DsHD FROM dbo.DmHD WITH (NOLOCK) WHERE (@Chk_HD = N'1')  AND (@M_Ma_HD = N'' OR Ma_HD = @M_Ma_HD) AND (@M_Nh_HD1 = N'' OR Nh_HD1 = @M_Nh_HD1) AND (@M_Nh_HD2 = N'' OR Nh_HD2 = @M_Nh_HD2) AND (@M_Nh_HD3 = N'' OR Nh_HD3 = @M_Nh_HD3) 
	--------------------------------------------------------------------------------------------------------------------
	---2: Lấy dữ liệu trong HDX ra
	SET @Ma = '06' ---Chờ ghép số khung
	SELECT '01' as Ftag,@Sl as Stt_Xe,@Ma as SapXep,*,@Ngay as Ngay_Xep,@So_khung As So_khung
		,0*Tien_Nt as Da_TT
		, (Tien_nt - CK - KM_Khac) AS TT
		,N'0' as Da_Xuat_HD	
		,N'0' as is_mau
		,@Ten as Chi_Tieu_Xe
		,@Ten as ten_Kx,@Ten as Ten_mau,@Ten as Ten_mau_nt,@Ten as Ten_Hs,@Ten as Ten_Bp,@Ten as Ten_ttcp
		---,@Ten as Ten_Nh_HD1,@Ten as Ten_Nh_HD2,@Ten as Ten_Nh_HD3		
		,@BackColor as ForeColor,@BackColor as BackColor,@BackColor as BackColor2,@Ma as Ma_Color,@Ten as Ten_Color,N'0' as Bold	
	INTO #DsXe FROM dbo.CT70HDX WITH (NOLOCK) WHERE (ma_ct = N'HDX') AND (ma_dvcs = @M_Ma_DVCS) AND (Ma_Post>=@Ma_Post) 		
		AND ((@M_Stt_Rec = N'' AND Ngay_Gx BETWEEN @Ngay_Ct1 AND @Ngay_Ct2) OR (stt_rec = @M_Stt_Rec))	
		AND (@M_Stt_Rec0 = N'' OR stt_rec0 = @M_Stt_Rec0)	
		AND (@M_ma_Kh = N'' OR ma_kh = @M_ma_Kh)	AND (@M_ma_KX = N'' OR ma_KX = @M_ma_KX) AND (@M_ma_Mau = N'' OR ma_Mau = @M_ma_Mau) 		
		AND (@Chk_HD = N'0' OR Ma_HD IN (SELECT Ma_HD FROM #DsHD))	
		AND (@M_ALL = N'1' OR ((Huy_CT <> '1') AND Huy <> '1'))			
	--select * from #DsXe return
	--------------------------------------------------------------------------------------------------------------------
	---3: Lấy thông tin xếp xe + TVBH + Kiểu xe + Màu xe
	UPDATE #DsXe SET #DsXe.So_khung =  a.So_khung ,#DsXe.Ngay_Xep =  a.Ngay_Xep FROM dbo.BEXEPXE as a WITH (NOLOCK) WHERE a.ma_Dvcs = @M_ma_Dvcs AND #DsXe.Ma_HD = a.Ma_HD AND #DsXe.Stt_rec0 = a.Stt_Rec0 	
	UPDATE #DsXe SET #DsXe.Ten_Hs = a.ten_Hs FROM dbo.DMHS as a WITH (NOLOCK) WHERE a.ma_Hs = #DsXe.ma_HS
	UPDATE #DsXe SET #DsXe.Ten_BP = a.ten_BP FROM dbo.DMBP as a WITH (NOLOCK) WHERE a.ma_BP = #DsXe.ma_BP
	UPDATE #DsXe SET #DsXe.Ten_ttcp = a.ten_ttcp FROM dbo.DMttcp as a WITH (NOLOCK) WHERE a.ma_TTCP = #DsXe.ma_TTCP

	UPDATE #DsXe SET #DsXe.Ten_KX = a.ten_KX,#DsXe.is_mau = a.Is_Mau FROM dbo.DMKX as a WITH (NOLOCK) WHERE a.ma_KX = #DsXe.ma_KX
	UPDATE #DsXe SET #DsXe.Ten_Mau = a.ten_Mau FROM dbo.DMmauxe as a WITH (NOLOCK) WHERE a.ma_Mau = #DsXe.ma_Mau
	UPDATE #DsXe SET #DsXe.Ten_mau_nt = a.Ten_mau FROM dbo.DmMauXeNt as a WITH (NOLOCK) WHERE a.Ma_mau_Nt = #DsXe.Ma_Mau_Nt
	--UPDATE #DsXe SET #DsXe.Da_TT= (SELECT SUM(ps) FROM CT00 WHERE ma_hd= @Ma)
	--------------------------------------------------------------------------------------------------------------------	
	---4: Tính đã thanh toán/Đã xuất HĐ
	EXECUTE [dbo].[CP_BeXepXe_Da_Thu_HD] @M_Load,@M_ALL,@M_Is_Xep_Xe,@M_Thang1,@M_Nam1,@M_Thang2,@M_Nam2,@M_Stt_Rec,@M_Stt_Rec0,@M_Ma_KX,@M_Ma_Mau,@M_Ma_KH,@M_Ma_HD,@M_Nh_HD1,@M_Nh_HD2,@M_Nh_HD3,@M_Ma_DVCS,@M_User_name

	--------------------------------------------------------------------------------------------------------------------	
	---5: TÍnh toán màu xe: Các trạng thái để update vào trường Ma_Color
	UPDATE #DsXe SET Ma_Color = '01' WHERE GT1 > Da_TT AND GT1 > 0 AND Ngay1 < @Ngay_HT
	UPDATE #DsXe SET Ma_Color = '02' WHERE Da_Xuat_HD = '1' --- Đã xuất hóa đơn
	UPDATE #DsXe SET Ma_Color = '03' WHERE Huy_CT = '1' --- Hủy chi tiết
	UPDATE #DsXe SET Ma_Color = '04' WHERE Ma_Post = '2' --- Chờ duyệt
	UPDATE #DsXe SET Ma_Color = '05' WHERE So_khung <> '' AND Da_Xuat_HD <> '1' --- Đã ghép số khung, chưa xuất hóa đơn
	
	--------------------------------------------------------------------------------------------------------------------	
	---6: Tính toán Stt_Xe còn hiệu lực và tính trường sắp xếp
		--6.1: Stt_Xe: Is_Mau = '1'
			UPDATE #DsXe SET #DsXe.Stt_Xe = a.Stt_Xe FROM(
				SELECT ROW_NUMBER() OVER(PARTITION BY Ma_Kx,Ma_Mau ORDER BY Ma_Kx,Ma_Mau,Ngay_GX,Ngay_CT) as Stt_Xe,Ma_Kx,Ma_Mau,Stt_Rec,Stt_Rec0,Ngay_GX FROM #DsXe WHERE Is_mau = '1' AND Ma_Color NOT IN ('01','02','03','04')
				) as a WHERE a.Stt_Rec = #DsXe.Stt_rec AND a.Stt_Rec0 = #DsXe.Stt_rec0
		--6.2: Stt_Xe: Is_mau = '0'
			UPDATE #DsXe SET #DsXe.Stt_Xe = a.Stt_Xe FROM(
				SELECT ROW_NUMBER() OVER(PARTITION BY Ma_Kx ORDER BY Ma_Kx,Ma_Mau,Ngay_GX,Ngay_CT) as Stt_Xe,Ma_Kx,Ma_Mau,Stt_Rec,Stt_Rec0,Ngay_GX FROM #DsXe WHERE Is_mau = '0' AND Ma_Color NOT IN ('01','02','03','04')
				) as a WHERE a.Stt_Rec = #DsXe.Stt_rec AND a.Stt_Rec0 = #DsXe.Stt_rec0	
		---6.3: Stt_Xe
			UPDATE #DsXe SET SapXep = 	Ma_Kx + Ma_Mau + CONVERT(NVARCHAR(8),Ngay_GX,112) + CONVERT(NVARCHAR(8),Ngay_CT,112) +  RIGHT('00000' + RTRIM(LTRIM(STR(Stt_Xe))),5)	
	--------------------------------------------------------------------------------------------------------------------
	---7: Tính chỉ tiêu xe
	--EXECUTE [dbo].[CP_BeXepXe_Chi_Tieu] @M_Load,@M_ALL,@M_Is_Xep_Xe,@M_Thang1,@M_Nam1,@M_Thang2,@M_Nam2,@M_Stt_Rec,@M_Stt_Rec0,@M_Ma_KX,@M_Ma_Mau,@M_Ma_KH,@M_Ma_HD,@M_Nh_HD1,@M_Nh_HD2,@M_Nh_HD3,@M_Ma_DVCS,@M_User_name					
	--------------------------------------------------------------------------------------------------------------------
	---8: Lấy thông tin số hãng
	UPDATE #DsXe SET #DsXe.So_Hang = a.So_Hang FROM dbo.BeXepxeSH as a WHERE a.ma_Dvcs = @M_Ma_DVCS AND a.Ma_Hd = #DsXe.ma_hd AND a.Stt_Rec0 = #DsXe.stt_rec0 	
	--------------------------------------------------------------------------------------------------------------------
	---9: Lấy thông số màu và View bảng	
	UPDATE #DsXe SET #DsXe.BackColor = a.BackColor,#DsXe.BackColor2 = a.BackColor2,#DsXe.ForeColor = a.ForeColor,#DsXe.Ten_Color = a.Ten_Color FROM #Color as a WHERE a.Ma_Color = #DsXe.Ma_Color	

	SELECT CONVERT(BIT,'0')  as Tag,* FROM #DsXe 
	WHERE @M_Is_Xep_Xe <> '2' OR Ma_Color IN ('02','05','06','08','01')	
	ORDER BY SapXep ----Ma_Kx,Ma_Mau,Ftag,Ngay_GX,Ngay_CT	
		
	--INSERT #Color SELECT '01','Yellow','','',N'QH đặt cọc'
	--INSERT #Color SELECT '02','Violet','','',N'Đã xuất HĐ'
	--INSERT #Color SELECT '03','Red','','White',N'Hủy'	
	--INSERT #Color SELECT '04','GreenYellow','','',N'Chờ duyệt'
	--INSERT #Color SELECT '05','Cyan','','',N'Đã ghép SK'
	--INSERT #Color SELECT '06','','','',N'Chờ ghép SK'	
	--INSERT #Color SELECT '07','Pink','','',N'Thừa xe'	
	--INSERT #Color SELECT '08','Brown','','White',N'Thiếu xe'
	--------------------------------------------------------------------------------------------------------------------
	---10: Đưa thông tin ra nếu là Load
	
	IF  @M_Load <> N'1'  GOTO _KT
	SELECT TOP 1 * FROM Dbo.DMCT WITH (NOLOCK) WHERE ma_ct = N'HDX'	
	--------------------------------------------------------------------------------------------------------------------
	SELECT TOP 0 * INTO #DetailVoucher FROM dbo.Detail_Voucher WITH (NOLOCK) WHERE 1=0;SELECT TOP 0  * INTO #DetailVoucher0 FROM dbo.Detail_Voucher WITH (NOLOCK) WHERE 1=0;	EXECUTE dbo.CP_InsertBlankRow '#DetailVoucher0'
	IF @M_ALL = N'1' UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'TAG' ,Field_type = N'B',Field_Width = 40,Field_Head1 = N'Chọn'  ,Field_Reonly = N'0',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 						
	---UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'STT' ,Field_type = N'N',Field_Width = 50,Field_Head1 = N'STT',Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'STT_XE' ,Field_type = N'N',Field_Width = 50,Field_Head1 = N'STT',Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ten_TTCP' ,Field_type = N'C',Field_Width = 180,Field_Head1 = N'Điểm kinh doanh'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 	

	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ngay_Ct' ,Field_type = N'D',Field_Width = 90,Field_Head1 = N'Ngày ĐKHĐ'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 		
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'SO_HD' ,Field_type = N'C',Field_Width = 80,Field_Head1 = N'Số HĐ'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 		
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'MA_HD' ,Field_type = N'C',Field_Width = 180,Field_Head1 = N'Số hợp đồng'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 	
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ten_KH' ,Field_type = N'TB',Field_Width = 300,Field_Head1 = N'Khách hàng'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 								
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Dien_Thoai' ,Field_type = N'C',Field_Width = 120,Field_Head1 = N'Điện thoại'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 							

	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'MA_KX' ,Field_type = N'TB',Field_Width = 80,Field_Head1 = N'Mã Kx'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0	
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'TEN_KX' ,Field_type = N'TB',Field_Width = 120,Field_Head1 = N'Ten_kx'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 							
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'MA_MAU' ,Field_type = N'C',Field_Width = 60,Field_Head1 = N'Color'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 						
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ten_MAU' ,Field_type = N'C',Field_Width = 70,Field_Head1 = N'Màu'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'MA_MAU_NT' ,Field_type = N'C',Field_Width = 60,Field_Head1 = N'Mã màu NT'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 						
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ten_MAU_NT' ,Field_type = N'C',Field_Width = 70,Field_Head1 = N'Màu NT'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0
	--UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'Ngay_GX' ,Field_type = N'D',Field_Width = 80,Field_Head1 = N'Ngày GX'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 			
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'Ngay1' ,Field_type = N'D',Field_Width = 80,Field_Head1 = N'Đặt cọc'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 
	--UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'So_Hang' ,Field_type = N'TB',Field_Width = 80,Field_Head1 = N'Số hãng'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 			
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'So_khung' ,Field_type = N'TB',Field_Width = 150,Field_Head1 = N'Số khung'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 				
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Nam_sx' ,Field_type = N'TB',Field_Width = 80,Field_Head1 = N'Năm SX'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 				
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name = N'Ten_Color' ,Field_type = N'C',Field_Width = 100,Field_Head1 = N'Thừa/thiếu'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0
		
		
	--UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'TT' ,Field_type = N'N',Field_Width = 100,Field_Head1 = N'Giá trị HD'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 		
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Da_TT' ,Field_type = N'N',Field_Width = 100,Field_Head1 = N'Đã Thanh toán'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 	
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ten_HS' ,Field_type = N'C',Field_Width = 120,Field_Head1 = N'TV Bán hàng'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 	
	
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'SO_MAY' ,Field_type = N'C',Field_Width = 120,Field_Head1 = N'Số Máy'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 				
	UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ngay_Xep' ,Field_type = N'D',Field_Width = 100,Field_Head1 = N'Ngày xếp xe'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 		
	
	--UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'MA_KX' ,Field_type = N'TB',Field_Width = 80,Field_Head1 = N'Xe'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 							
	
	--UPDATE #DetailVoucher0 SET Name = N'',SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'MA_MAU' ,Field_type = N'C',Field_Width = 80,Field_Head1 = N'Màu'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 						
	
	
	SELECT * FROM #DetailVoucher
	-------------------------------------------------------------------------------------------------------
	SELECT * FROM #Color
_KT:	
END
