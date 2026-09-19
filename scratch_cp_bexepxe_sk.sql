
CREATE PROCEDURE [dbo].[CP_BeXepXe_SK]
	@M_Load [nvarchar](1) = N'1',
	@M_Stt_Rec [nvarchar](50) = N'',
	@M_Stt_Rec0 [nvarchar](50) = N'',
	@M_Ma_DVCS [nvarchar](50) = N'01',
	@M_User_name [nvarchar](100) = N'ABC'
--WITH ENCRYPTION, EXECUTE AS CALLER
AS
BEGIN
	SET NOCOUNT ON;
	
	DECLARE @Ma_KX NVARCHAR(50) = N'',@Ma NVARCHAR(50) = N'',@Ma_Mau NVARCHAR(50) = N'',@Ma_Mau_Nt NVARCHAR(50) = N'',@Nam_MIN NUMERIC(5,0),@Ngay_MIN SMALLDATETIME,@Dien_Giaii NVARCHAR(400) = N''
	,@Ngay_Dau_Nam SMALLDATETIME
	-------------------------------------------------------------------------------------------------------
	
	SELECT TOP 1 @Ma_KX = Ma_Kx,@Ma_Mau = Ma_Mau,@Ma_Mau_Nt = Ma_Mau_Nt FROM dbo.CT70HDX WITH (NOLOCK) WHERE Stt_Rec =@M_Stt_Rec AND Stt_Rec0 =@M_Stt_Rec0	
	SELECT @Nam_MIN = MIN(Nam) FROM dbo.CDXE  --WHERE (Ma_Kx = @Ma_KX) AND (ma_mau = @Ma_Mau)  AND (Nam <> 0)	-- AND (ma_dvcs = @M_Ma_DVCS)	
	IF @Nam_MIN IS NULL  BEGIN SET @Nam_MIN = 1900;SET @Ngay_MIN = N'19000101';END ELSE SET @Ngay_MIN = dbo.CF_Ngay_DauThang(1,@Nam_MIN)					
	SET @Ngay_Dau_Nam = dbo.CF_Ngay_DauThang(1,@Nam_Min)
	---1: Nhung so khung duoc nhap ve
	SELECT So_khung, Ma_kx, Ma_kx_new, ma_mau,ma_mau_new, ngay_hl INTO #DSDoi_KX FROM dbo.DsDoiMA_KX  WITH (NOLOCK) WHERE ngay_hl > '20200101' order by Ngay_Hl Desc
	--> Từ phiếu nhập mua xe của kế toán:
	SELECT * INTO #Ct70BE FROM dbo.CT70BE WITH (NOLOCK) WHERE (NXT = N'1')  AND (ma_ct = N'PN3' OR ma_ct = N'PN4') AND (ngay_ct >=@Ngay_Dau_Nam)
	UPDATE #Ct70BE SET Ma_kx = a.Ma_kx_new FROM #DSDoi_KX  AS a WITH (NOLOCK) WHERE a.So_khung = #Ct70BE.So_khung AND a.So_khung <> N'' AND a.Ngay_hl >=#Ct70BE.Ngay_ct
	UPDATE #Ct70BE SET Ma_mau = a.Ma_mau_new FROM #DSDoi_KX  AS a WITH (NOLOCK) WHERE a.So_khung = #Ct70BE.So_khung AND a.So_khung <> N'' AND a.Ngay_hl >=#Ct70BE.Ngay_ct AND a.Ma_mau_new<>N''

	SELECT So_khung, MAX(Ma_Mau_NT) AS Ma_Mau_NT, MAX(Ma_kx) AS ma_kx,MAX(So_May) as So_May,MAX(Ngay_CT) as Ngay_CT, MAX(Nam_Sx) AS Nam_SX,'0' as Chua_Xep,@Dien_Giaii as Dien_Giai 
		INTO #Nhap FROM dbo.#Ct70BE WITH (NOLOCK) WHERE 
		(NXT = N'1') AND (Ma_Kx = @Ma_KX) 
		AND (ma_mau = @Ma_Mau) 
		AND (ma_ct = N'PN3' OR ma_ct = N'PN4') 
		AND (ngay_ct >=@Ngay_Dau_Nam) --AND (ma_dvcs = @M_Ma_DVCS) 
		AND (Ma_mau_nt ='' OR Ma_mau_nt = @Ma_Mau_Nt)
	GROUP BY So_Khung
	
	--> Nguồn từ xe vật lý (xác xe)
	SELECT * INTO #Ct70BEX FROM dbo.Ct70BEX WITH (NOLOCK) WHERE  (ma_ct = N'PN7') AND (ngay_ct >=@Ngay_Dau_Nam)  --(ma_mau = @Ma_Mau) AND HANGPT 29/10 check đổi màu
	UPDATE #Ct70BEX SET Ma_kx = a.Ma_kx_new FROM #DSDoi_KX  AS a WITH (NOLOCK) WHERE a.So_khung = #Ct70BEX.So_khung AND a.So_khung <> N'' AND a.Ngay_hl >=#Ct70BEX.Ngay_ct
	UPDATE #Ct70BEX SET Ma_mau = a.Ma_mau_new FROM #DSDoi_KX  AS a WITH (NOLOCK) WHERE a.So_khung = #Ct70BEX.So_khung AND a.So_khung <> N'' AND a.Ngay_hl >=#Ct70BEX.Ngay_ct AND a.Ma_mau_new<>N''
	INSERT #Nhap SELECT So_khung, @Ma as Ma_Mau_NT, MAX(Ma_kx) AS ma_kx,MAX(So_May) as So_May,MAX(Ngay_ct) as Ngay_Ct, MAX(Nam_Sx) AS Nam_SX,'0' as Chua_Xep,MAX(Dien_Giai) as Dien_Giai  FROM dbo.#Ct70BEX WITH (NOLOCK) WHERE (Ma_Kx = @Ma_KX) AND (ma_mau = @Ma_Mau) AND (ma_ct = N'PN7') AND (ngay_ct >=@Ngay_Dau_Nam) --AND (ma_dvcs = @M_Ma_DVCS)
		--AND (Ma_mau_nt = @Ma_Mau_Nt)
		AND (So_khung NOT IN (SELECT So_khung FROm #Nhap)) GROUP BY So_khung
		
	-- Update đổi kiểu xe:
	-- Nguồn từ tồn xe kế toán:
	SELECT * INTO #CDXE FROM Dbo.CDXE WITH (NOLOCK) WHERE  (nam >= @Nam_MIN) --(ma_mau = @Ma_Mau)  AND
	--SELECT TOP 1 * INTO #DSDoi_KX FROM dbo.DsDoiMA_KX  WITH (NOLOCK) WHERE So_khung IN (SELECT So_khung FROM #CDXE) order by Ngay_Hl Desc
	UPDATE #CDXE SET Ma_kx = a.Ma_kx_new FROM #DSDoi_KX  AS a WITH (NOLOCK) WHERE a.So_khung = #CDXE.So_khung AND a.So_khung <> N'' AND a.Ngay_hl >=#CDXE.Ngay_nhap
	UPDATE #CDXE SET Ma_mau = a.Ma_mau_new FROM #DSDoi_KX  AS a WITH (NOLOCK) WHERE a.So_khung = #CDXE.So_khung AND a.So_khung <> N'' AND a.Ngay_hl >=#CDXE.Ngay_nhap AND a.Ma_mau_new <>N''
	--- 
	INSERT #Nhap SELECT So_khung, @Ma as Ma_Mau_NT, MAX(Ma_kx) AS ma_kx,MAX(So_May) as So_May,MAX(Ngay_Nhap) as Ngay_Ct, MAX(Nam_Sx) AS Nam_SX,'0' as Chua_Xep,@Dien_Giaii as Dien_Giai  
		FROM dbo.#CDXE WHERE (Ma_Kx = @Ma_KX) AND (ma_mau = @Ma_Mau)  AND (nam >= @Nam_MIN) --AND (ma_dvcs = @M_Ma_DVCS)
		AND (So_khung NOT IN (SELECT So_khung FROm #Nhap)) GROUP BY So_khung	

	--> Lấy thêm từ kế hoạch giao xe: select Ma_kx,nam_SX, * from ctkh where ma_ct ='K10'
	SELECT So_khung, MAX(Ma_Mau_NT) AS Ma_Mau_NT, MAX(Ma_kx) AS ma_kx,MAX(So_May) as So_May,MAX(Ngay_Nhap_xe) as Ngay_Ct, MAX(Nam_Sx) AS Nam_SX,'0' as Chua_Xep,MAX(Dien_Giai) AS Dien_Giai  
	INTO #CTKHNM FROM dbo.CtKH WITH (NOLOCK) WHERE (Ma_ct ='K10') AND (Ma_Kx = @Ma_KX) AND (ma_mau = @Ma_Mau) AND (So_khung <>'')-- AND (ngay_ct >=@Ngay_Dau_Nam) 
		AND (So_khung NOT IN (SELECT So_khung FROM #Nhap)) GROUP BY So_khung
	EXEC dbo.CP_InsertTable '#CTKHNM','#Nhap','1=1'

			
	UPDATE #Nhap SET #Nhap.Chua_Xep = N'1' FROM dbo.BEXEPXE WITH (NOLOCK) WHERE dbo.BEXEPXE.ma_Dvcs = @M_Ma_DVCS AND #Nhap.So_Khung = dbo.BEXEPXE.So_khung	
	-------------------------------------------------------------------------------------------------------

	---Bạn có thể thêm thông tin số khung ở đây: Lấy phần thông tin xe ở PN8	
	SELECT So_Khung,MAX(Dien_Giaii) as Dien_Giai INTO #Thong_Tin FROM dbo.CTPN8 WITH (NOLOCK) WHERE (ma_Dvcs = @M_Ma_DVCS) AND (Ma_Post <> '9') AND (So_Khung IN (SELECT So_Khung FROM #Nhap)) GROUP BY So_Khung
	
	UPDATE #Nhap SET #Nhap.Dien_Giai = a.Dien_Giai FROM #Thong_Tin as a WHERE a.So_Khung = #Nhap.So_Khung		
	UPDATE #nhap SET Dien_giai = a.Dien_Giaii FROM dbo.Ctpn7 AS a WITH (NOLOCK) WHERE  a.So_Khung = #Nhap.So_Khung AND a.Dien_giaii <>N''
	UPDATE #nhap SET Ma_Mau_NT =a.Ma_mau_Nt FROM CT70BEX a WHERE #nhap.So_Khung=a.So_Khung AND a.nxt='1' AND a.ma_mau_nt <>''
	UPDATE #nhap SET Ma_Mau_NT =a.Ma_mau_Nt FROM ctkh a WHERE #nhap.So_Khung=a.So_Khung AND a.ma_mau_nt <>''

	-------------------------------------------------------------------------------------------------------
	--select @Ma_Mau_Nt return
		--select Ma_Mau_Nt,* from #Nhap where so_khung ='RLNVBL9K0SH724326'; return

	SELECT * FROM #Nhap WHERE Chua_Xep = N'0' AND (Ma_mau_nt = @Ma_Mau_Nt)  ORDER BY Ngay_CT,So_Khung,So_May
	-------------------------------------------------------------------------------------------------------
	IF  @M_Load <> N'1'  GOTO _KT
	SELECT TOP 1 * INTO #DmCt FROM Dbo.DMCT WHERE ma_ct = N'HDX';UPDATE DMCT SET ColFrozen_Master = 3	
	SELECT * FROM #DmCt
	-------------------------------------------------------------------------------------------------------
	SELECT TOP 0 * INTO #DetailVoucher FROM dbo.Detail_Voucher WHERE 1=0;SELECT TOP 0  * INTO #DetailVoucher0 FROM dbo.Detail_Voucher WHERE 1=0;	EXECUTE dbo.CP_InsertBlankRow '#DetailVoucher0'		 		
	
	UPDATE #DetailVoucher0 SET SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'So_khung' ,Field_type = N'TB',Field_Width = 120,Field_Head1 = N'Số khung'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 				
	UPDATE #DetailVoucher0 SET SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'SO_MAY' ,Field_type = N'C',Field_Width = 120,Field_Head1 = N'Số Máy'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 					
	UPDATE #DetailVoucher0 SET SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'NAM_SX' ,Field_type = N'N',Field_Width = 70,Field_Head1 = N'Năm SX'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 					
	UPDATE #DetailVoucher0 SET SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ngay_Ct' ,Field_type = N'D',Field_Width = 90,Field_Head1 = N'Ngày HĐ nhập'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 		
	UPDATE #DetailVoucher0 SET SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Ngay_VE' ,Field_type = N'D',Field_Width = 90,Field_Head1 = N'Ngày về'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 			
	UPDATE #DetailVoucher0 SET SttVoucher = SttVoucher  + 1,SttView = SttView + 1,Field_name =  'Dien_Giai' ,Field_type = N'C',Field_Width = 150,Field_Head1 = N'Ghi chú'  ,Field_Reonly = N'1',BackColor  = N'';INSERT #DetailVoucher SELECT * FROM #DetailVoucher0 		
	SELECT * FROM #DetailVoucher
	-------------------------------------------------------------------------------------------------------
	_KT:
END
