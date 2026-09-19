--EXECUTE dbo.CP_BETONXE '','',N'20200101',N'20200814','','','','',N'1',N'0',N'0',N'0',N'CP_BETONXE',N'VND',N'01',N'abc'
CREATE PROCEDURE [dbo].[CP_BETONXE]
	@M_Ma_Kho NVARCHAR(50)
	,@M_Ma_Kx NVARCHAR(50)
	,@M_Ngay_Ct1 SMALLDATETIME
	,@M_Ngay_Ct2 SMALLDATETIME
	,@M_Ma_Mau NVARCHAR(50)
	,@M_Nh_Kx1 NVARCHAR(50)
	,@M_Nh_Kx2 NVARCHAR(50)
	,@M_Nh_Kx3 NVARCHAR(50)
	,@M_Ct_Dc NVARCHAR(5)
	,@M_Group1 NVARCHAR(1)
	,@M_Group2 NVARCHAR(1)
	,@M_Group3 NVARCHAR(1)
	,@M_Cp_Name NVARCHAR(400)
	,@M_Ma_ttcp1 [nvarchar](30) = N''
	,@M_Ma_ttcp2 [nvarchar](30) = N''
	,@M_Ma_TTCP [nvarchar](30) = ''
	,@M_Loai_BC NVARCHAR(10)
	,@M_Ma_Dvcs NVARCHAR(50)
	,@M_User_Name NVARCHAR(100)
AS
BEGIN
	SET NOCOUNT ON;
	DECLARE @DsUnits TABLE(Ma_Dvcs NVARCHAR(30));INSERT @DsUnits SELECT Ma_Dvcs FROM [Dbo].[CF_SmRightsListsUnits](@M_User_Name) WHERE (@M_Ma_Dvcs = N'' OR Ma_Dvcs = @M_Ma_Dvcs)
	DECLARE @Ma_Post NVARCHAR(10) = Dbo.CF_GetPostKX(@M_Ma_Dvcs),@M_LAN NVARCHAR(1) =Dbo.[CF_SysGetlanguage](@M_User_Name),@Tu_Ngay NVARCHAR(4000)
	DECLARE @S1 NVARCHAR(500),@S2 NVARCHAR(500),@Ten_Kho NVARCHAR(200),@Ten_Kx NVARCHAR(200),@Ten_Mau NVARCHAR(200),@Ten NVARCHAR(200) = N''
		,@Ma NVARCHAR(50) = N'',@Chk_Kx NVARCHAR(1) = N'0',@nTon_Dau NUMERIC(20,4),@nDu_Dau NUMERIC(20,4),@nDu_Dau_NT NUMERIC(20,4)
		,@nTon_Cuoi NUMERIC(20,4),@nDu_Cuoi NUMERIC(20,4),@nDu_Cuoi_NT NUMERIC(20,4)
		,@nSL_Nhap NUMERIC(20,4),@nTien_Nhap NUMERIC(20,4),@nTien_Nt_N NUMERIC(20,4),@Is_AdMin NUMERIC(5,0)=0
		,@nSL_Xuat NUMERIC(20,4),@nTien_Xuat NUMERIC(20,4),@nTien_Nt_X NUMERIC(20,4)		
		,@Date SMALLDATETIME = N'',@Num NUMERIC (20,4) = 0,@Tien NUMERIC(20,4),@Count NUMERIC(5,0)= 0 ,@XE_Giucho NUMERIC (5,0) = 0
		,@Cp_Detail NVARCHAR(4000),@StrPRDetail NVARCHAR(4000) = N'',@StrPRDetail1 NVARCHAR(4000)
		,@BackColor NVARCHAR(100) = N'',@Ngay_Dau_Nam SMALLDATETIME,@Ngay SMALLDATETIME = N'19000101'
	--> SET
	SET @Ngay_Dau_Nam = Dbo.CF_Getstartdate(@M_Ngay_Ct1)	
	SET @M_Ma_Kx = RTRIM(LTRIM(@M_Ma_Kx));SET @M_Ma_Mau = RTRIM(LTRIM(@M_Ma_Mau));SET @M_Ma_Kho = RTRIM(LTRIM(@M_Ma_Kho))--;SET @M_Tk_Vt = RTRIM(LTRIM(@M_Tk_Vt))
	SET @M_Nh_Kx1 = RTRIM(LTRIM(@M_Nh_Kx1))	;SET @M_Nh_Kx2 = RTRIM(LTRIM(@M_Nh_Kx2));SET @M_Nh_Kx3 = RTRIM(LTRIM(@M_Nh_Kx3))
	SET @M_Ct_Dc = LTRIM(RTRIM(@M_Ct_Dc))
	SET @Ten_Kho  =(SELECT TOP 1 Ten_Kho FROM .Dbo.Dmkho WHERE Ma_Kho = @M_Ma_Kho);IF @Ten_Kho IS NULL SET @Ten_Kho = N''
	SET @Ten_Kx  =(SELECT TOP 1 Ten_Kx FROM .Dbo.dmkx WHERE Ma_Kx = @M_Ma_Kx);IF @Ten_Kx IS NULL SET @Ten_Kx = N''
	IF @M_LAN = N'V'
		BEGIN
			IF @Ten_Kho = N'' SET @Ten_Kho =  N'Tất cả các kho' ELSE SET @Ten_Kho = N'Kho:' + @M_Ma_Kho + N' - ' + RTRIM(@Ten_Kho)
			IF @Ten_Kx = N'' SET @Ten_Kx =  N'Tất cả các kiểu xe' ELSE SET @Ten_Kx = N'Kiểu xe:' + @M_Ma_Kx + N' - ' + RTRIM(@Ten_Kx)				
			IF @Ten_Mau = N'' SET @Ten_Mau =  N'Tất cả các màu xe' ELSE SET @Ten_Mau = N'Màu :' + @M_Ma_Mau + N' - ' + RTRIM(@Ten_Mau)		
		END
	ELSE
		BEGIN
			IF @Ten_Kho = N'' SET @Ten_Kho =  N'All Warehouse' ELSE SET @Ten_Kho = N'Warehouse:' + @M_Ma_Kho + N' - ' + RTRIM(@Ten_Kho)
			IF @Ten_Kx = N''  SET @Ten_Kx =  N'All goods' ELSE SET @Ten_Kx = N'goods:' + @M_Ma_Kx + N' - ' + RTRIM(@Ten_Kx)				
			IF @Ten_Mau = N'' SET @Ten_Mau =  N'All Colors' ELSE SET @Ten_Mau = N'Color:' + @M_Ma_Mau + N' - ' + RTRIM(@Ten_Mau)
		
		END	
	----------------------------------------------------------------------------------------------------------	
	SET @Chk_Kx = N'0'
	IF @M_Nh_Kx1 <> N'' SET @Chk_Kx = N'1';IF @M_Nh_Kx2 <> N'' SET @Chk_Kx = N'1';IF @M_Nh_Kx3 <> N'' SET @Chk_Kx = N'1';--IF @M_Tk_Vt <> N'' SET @Chk_Kx = N'1'	
	SELECT Ma_Kx INTO #DsKx FROM .Dbo.dmkx WHERE (@Chk_Kx = N'1')  AND (@M_Nh_Kx1 = N'' OR Nh_Kx1 = @M_Nh_Kx1) AND (@M_Nh_Kx2 = N'' OR Nh_Kx2 = @M_Nh_Kx2) AND (@M_Nh_Kx3 = N'' OR Nh_Kx3 = @M_Nh_Kx3)-- AND (@M_Ma_Mau= N'' OR Ma_Mau = @M_Tk_VT)			
	--------------------------------------------------------------------------------------------------------------------------------
	SELECT @Is_AdMin = is_admin FROM dbo.Userinfo WITH (NOLOCK) WHERE user_name = @M_User_Name

	SELECT TOP 0 * INTO #TTCP FROM GroupUser WHERE 1=0

	IF @Is_AdMin = 1
	BEGIN
		SELECT "Group" INTO #TTCP1 FROM dbo.GroupUser WITH (NOLOCK) GROUP BY "Group"  
		EXECUTE CP_InsertTable '#TTCP1','#TTCP','1=1'
	END
	ELSE
	BEGIN
		SELECT "Group" INTO #TTCP0 FROM dbo.GroupUser WITH (NOLOCK) WHERE User_Name = @M_User_Name GROUP BY "Group"
		SELECT Code AS "GROUP" INTO #TTCP2 FROM GroupRightCTList AS a WHERE ((a."Group" IN (SELECT "Group" FROM #TTCP0)) AND a."Name" = 'DMTTCP') GROUP BY Code
		EXECUTE CP_InsertTable '#TTCP2','#TTCP','1=1'
	END

	SELECT * INTO #dmTTCP FROM dmTTCP AS a WHERE (@M_Ma_ttcp1 = N'' OR a.Nh_TTCP1= @M_Ma_ttcp1)
			AND (@M_Ma_ttcp2 = N'' OR a.Nh_TTCP2= @M_Ma_ttcp2)
			AND (@M_Ma_ttcp = N'' OR a.Ma_TTCP= @M_Ma_ttcp)
			AND (Ma_TTCP IN (SELECT "Group" FROM #TTCP))
	----------------------------------------------------------------------------------------------------------			
	--lay du lieu
	SELECT Ma_Dvcs, Ma_kho,stt_rec,Ngay_Ct,Ma_Ct,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,Nxt,SUM(So_luong) as So_luong,SUM(Tien) as Tien,SUM(Tien_NT) as Tien_NT 
		,SUM(So_luong) as Sl_Nhap,SUM(Tien) as Tien_Nhap,SUM(Tien_NT) as Tien_NT_N ,@BackColor AS BackColor,SUM(tien2) as tien2,SUM(thue_nt) AS thue_nt  
	INTO #Report0Ton FROM .Dbo.CT70BEX WHERE (Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct2) AND
		 (@M_Ma_Kx =N'' OR Ma_Kx = @M_Ma_Kx) AND (@M_Ma_Kho = N'' OR  Ma_Kho  = @M_Ma_Kho)		 
		  AND (@M_Ma_Mau =N'' OR  Ma_Mau  = @M_Ma_Mau) 
		  AND (Ma_Post >= @Ma_Post) AND (Ma_Dvcs IN (SELECT Ma_Dvcs FROM @DsUnits))		 
		  AND (@Chk_Kx =N'0' OR Ma_Kx IN (SELECT Ma_Kx FROm #DsKx))		
		  AND (ma_ct IN (N'PXX',N'PNX',N'PX7',N'PN7'))
		  AND ((@M_Ct_Dc = N'' OR  @M_Ct_Dc = N'1') OR Ct_Dc <> N'1') 	  	
		  AND (ma_kho IN (SELECT ma_kho FROM User_KhoXe WHERE @M_User_Name = User_Name) OR @Is_Admin = 1)
	GROUP BY Ma_Dvcs, Ma_kho,Ma_Kx,Ma_Mau,So_Khung,Nxt,Ngay_Ct,Ma_Ct,stt_rec

	--> Tinh ton dau nam
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) as So_May,Ngay_nhap as Ngay_Ct,@Ma as Stt_Rec,@Ma as Ma_Ct
		,SUM(Ton00) as Ton_Dau,SUM(Du00) as Du_Dau,SUM(Du_NT00) as Du_Dau_NT--,SUM(Gia_Xe) as Gia_Xe,SUM(Phu_Kien) as Phu_Kien
	INTO #CDXE
	FROM .Dbo.CDXEX WHERE (Ma_Dvcs IN (SELECT Ma_Dvcs FROM @DsUnits)) AND (Nam = YEAR(@M_Ngay_Ct1)) 				
		AND (@M_Ma_Kx = N'' OR Ma_Kx = @M_Ma_Kx) AND (@M_Ma_Kho = N'' OR  Ma_Kho  = @M_Ma_Kho)		
		AND (@M_Ma_Mau = N'' OR  Ma_Mau  = @M_Ma_Mau)
		AND (@M_Ma_Kho = N'' OR  Ma_Kho  = @M_Ma_Kho)	 
		AND (@Chk_Kx = N'0' OR Ma_Kx IN (SELECT Ma_Kx FROm #DsKx)) 
		AND (ma_kho IN (SELECT ma_kho FROM User_KhoXe WHERE @M_User_Name = User_Name) OR @Is_Admin = 1)
	GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,Ngay_nhap
	
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) as So_May,Ngay_Ct,@Ma as Stt_Rec,@Ma as Ma_Ct
		,SUM(Ton_Dau) as Ton_Dau,SUM(Du_Dau) as Du_Dau,SUM(Du_Dau_NT) as Du_Dau_NT
		,SUM(0*Ton_Dau) as Sl_Nhap,SUM(0*Du_Dau) as Tien_Nhap,SUM(0*Du_Dau_NT) as Tien_NT_N
		,SUM(0*Ton_Dau) as SL_xuat,SUM(0*Du_Dau) as Tien_xuat,SUM(0*Du_Dau_NT) as Tien_NT_X,SUM(Du_Dau*0.1)  as Thue_NT,@BackColor as BackColor
	INTO #Ton_Dau
	FROM #CDXE
	GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,Ngay_Ct
	
	DROP TABLE #CDXE

	--> Tinh nhap	 	
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,MAX(Ngay_Ct) AS Ngay_Ct,MAX(stt_rec) AS stt_rec,MAX(Ma_Ct) as Ma_Ct,SUM(So_luong) as Ton_Dau
		,SUM(Tien) as Du_Dau,SUM(Tien_NT) as Du_Dau_NT ,SUM(0*So_luong) as Sl_Nhap,SUM(0*Tien) as Tien_Nhap,SUM(0*Tien_NT) as Tien_NT_N
		,SUM(0*So_luong) as SL_xuat,SUM(0*Tien) as Tien_xuat,SUM(0*Tien_NT)   as Tien_NT_X ,SUM(thue_nt) as Thue_NT,@BackColor AS BackColor
		INTO #Nhap_Dau
		FROM #Report0Ton WHERE (nxt = N'1') 
		AND ((Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct1-1 AND @M_Ngay_Ct1 > @Ngay_Dau_Nam) OR (@M_Ngay_Ct1 = @Ngay_Dau_Nam AND Ngay_Ct = @Ngay_Dau_Nam))
		GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung      

	--> tinh xuat
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,MAX(Ngay_Ct) AS Ngay_Ct ,MAX(stt_rec) AS stt_rec,MAX(Ma_Ct) as Ma_Ct,SUM(-1*So_luong) as Ton_Dau
		,SUM(-1*Tien) as Du_Dau,SUM(-1*Tien_NT) as Du_Dau_NT,SUM(0*So_luong) as Sl_Nhap,SUM(0*Tien)  as Tien_Nhap,SUM(0*Tien_NT) as Tien_NT_N	
		,SUM(0*So_luong) as SL_xuat,SUM(0*Tien) as Tien_xuat,SUM(0*Tien_NT)  as Tien_NT_X ,SUM(thue_nt) as Thue_NT ,@BackColor AS BackColor
		INTO #Xuat_Dau
		FROM #Report0Ton WHERE (nxt = N'2') 
		AND ((Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct1-1 AND @M_Ngay_Ct1 > @Ngay_Dau_Nam) OR (@M_Ngay_Ct1 = @Ngay_Dau_Nam AND Ngay_Ct = @Ngay_Dau_Nam))
		GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung 

	--> tinh Du dau ky 
	INSERT #Ton_Dau SELECT * FROM #Nhap_Dau
	INSERT #Ton_Dau SELECT * FROM #Xuat_Dau
	
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,MAX(Ngay_Ct) AS Ngay_Ct,@Ma AS stt_rec,MAX(Ma_Ct) as Ma_Ct,SUM(Ton_Dau) as Ton_Dau
	,SUM(Du_Dau) as Du_Dau,SUM(Du_Dau_NT) as Du_Dau_NT 
	,SUM(Sl_Nhap) as Sl_Nhap,SUM(Tien_Nhap ) as Tien_Nhap,SUM(Tien_NT_N) as Tien_NT_N
	,SUM(SL_Xuat) as Sl_Xuat,SUM(Tien_xuat) as Tien_Xuat,SUM(Tien_NT_X) as Tien_NT_X,SUM(Thue_Nt) as Thue_NT,@BackColor AS Backcolor
	INTO #Ton1
	FROM #Ton_Dau 
	GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung
	
	----------------------------------------------------------------------------------------------------------				 	
	---:Tinh nhap trong ky
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,MAX(Ngay_Ct) AS Ngay_Ct,MAX(stt_rec) AS stt_rec,MAX(Ma_Ct) as Ma_Ct,SUM(0*So_luong ) as Ton_Dau
		,SUM(0*Tien) as Du_Dau,SUM(0*Tien_NT) as Du_Dau_NT
		,SUM(So_luong) as Sl_Nhap,SUM(Tien) as Tien_Nhap,SUM(Tien_NT) as Tien_NT_N
		,SUM(0*So_luong) as Sl_Xuat,SUM(0*So_luong) as Tien_Xuat,SUM(0*So_luong) as Tien_NT_X,SUM(thue_nt) as Thue_NT ,@BackColor AS BackColor
		INTO #Phat_Sinh_Nhap
	FROM #Report0Ton WHERE (nxt = N'1') AND (Ngay_Ct BETWEEN @M_Ngay_Ct1 AND @M_Ngay_Ct2) 
	GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,nxt

	---:Tinh Xuat trong ky
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,MAX(Ngay_Ct) AS Ngay_Ct ,MAX(stt_rec) AS stt_rec,MAX(Ma_Ct) as Ma_Ct ,SUM(0*So_Luong ) as Ton_Dau,SUM(0*Tien) as Du_Dau,SUM(0*Tien_NT) as Du_Dau_NT
		,SUM(0*So_Luong ) as SL_Nhap,SUM(0*Tien) as Tien_nhap,SUM(0*Tien_NT)  as Tien_NT_N
		,SUM(So_Luong) as SL_xuat,SUM(Tien) as Tien_xuat,SUM(Tien_NT)  as Tien_NT_X ,SUM(thue_nt) as Thue_NT  ,@BackColor AS BackColor
		INTO #Phat_Sinh_Xuat
	FROM #Report0Ton WHERE (nxt = N'2') AND (Ngay_Ct BETWEEN @M_Ngay_Ct1 AND @M_Ngay_Ct2) 
	GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,nxt
	----------------------------------------------------------------------------------------------------------	
	INSERT #Ton1 SELECT * FROM #Phat_Sinh_Nhap 
	INSERT #Ton1 SELECT * FROM #Phat_Sinh_Xuat
	
	----------------------------------------------------------------------------------------------------------
	---Tinh tong hop ton va nhap xuat 
	SELECT Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung,MAX(So_May) As So_May,MAX(Ngay_Ct) AS Ngay_Ct,MAX(stt_rec) AS stt_rec,MAX(Ma_Ct) as Ma_Ct,SUM(Ton_Dau) as Ton_Dau,SUM(Du_Dau) as Du_Dau,SUM(Du_Dau_NT) as Du_Dau_NT
		,SUM(Sl_Nhap) as SL_Nhap,SUM(Tien_Nhap) as Tien_nhap,SUM(Tien_NT_N)  as Tien_NT_N,
		SUM(Sl_Xuat) as SL_xuat,SUM(Tien_Xuat) as Tien_xuat,SUM(Tien_NT_X)  as Tien_NT_X,SUM(thue_nt) as Thue_NT , @BackColor AS BackColor
	INTO #tonnhapxuat
	FROM #Ton1  
	GROUP BY Ma_Dvcs,Ma_kho,Ma_Kx,Ma_Mau,So_Khung
	
	----------------------------------------------------------------------------------------------------------	
	---- Tinh Phat sinh Nhap xuat
	SELECT '0' as Bold,N'1' AS In_Ck,N'1' as V,N'5' as Ftag,N'0' Systotal,N'0' as DetailOK,@StrPRDetail as M_strPRDetail
		,@ma as Ma1,@ma as Ma2,@ma as Ma3,@ma as Ma4,@ma as Ma5
		,a.Ma_Dvcs,a.Ma_kho,MAX(Dmkho.Ten_Kho) as Ten_Kho,MAX(Dmkx.Ten_Kx) as Ten_Kx
		,a.Ma_Kx as Ma_Kx,a.Ma_Mau,a.So_Khung,a.So_May ,MAX(Ngay_Ct) AS Ngay_Ct,MAX(stt_rec) AS stt_rec,MAX(a.Ma_Ct) as Ma_Ct 
		,MAX(Dmmauxe.Ten_Mau) as Ten_Mau 
		,SUM(a.Ton_Dau)  AS Ton_Dau,SUM(a.Du_Dau)  AS Du_Dau,SUM(a.Du_Dau_NT)  AS Du_Dau_NT,
		SUM(a.Sl_Nhap)	AS SL_Nhap,SUM( a.Tien_Nhap)	AS Tien_Nhap,SUM(a.Tien_Nt_N) AS Tien_Nt_N ,SUM(a.Sl_Xuat) AS Sl_Xuat ,SUM(a.Tien_Xuat) AS Tien_Xuat,SUM(a.Tien_Nt_X)	AS Tien_Nt_X
		,SUM(0 *a.Sl_Nhap) AS  Ton_Cuoi,SUM(0 * a.Tien_Nhap) AS Du_Cuoi,SUM(0*a.Tien_Nt_N) AS Du_Cuoi_NT ,SUM(thue_nt) as Thue_NT ,@BackColor AS BackColor
		,@Ma as So_HD,@Ma as Ma_MauNT,@Ten as Ten_MauNT,@Date as Ngay_HD,@Ma as Thang_HD,@MA AS DC1,@Ma AS DC2,@Num as T_TT,@Ma as Thang_ct
		,CAST(1 as NUMERIC(20,0)) as SL_XE,@Num as Ngay_Ton,@Ma as Loai_Ton, @Ma as Ma_TVBH, @Ten AS note
		,@Num As LPK_NT,@Num As TPK_NT,@Num As Nam_SX, @Ma as Ma_HD, @Ten AS Ten_HD, @Ten AS Ten_TVBH, @Ten AS Tinh_trang,@Ngay AS Ngay_hdon,@Ngay AS Ngay_dong_thung
		,@Num AS User_Id, @Ten AS User_name, @Ma AS Ma_TTCP_HDX, @Ten AS Ten_TTCP_HDX
	INTO #Report0
	FROM #tonnhapxuat a 
		 LEFT JOIN Dbo.DmKx as Dmkx ON a.Ma_Kx = Dmkx.Ma_Kx
		 LEFT JOIN Dbo.Dmkho as Dmkho ON a.Ma_Kho = Dmkho.Ma_Kho
		 LEFT JOIN Dbo.Dmmauxe as Dmmauxe ON a.Ma_Mau = Dmmauxe.Ma_Mau		
	GROUP BY a.Ma_Dvcs,a.Ma_kho,a.Ma_Kx,a.Ma_Mau,a.So_Khung,a.So_May
	
	UPDATE #Report0 SET Nam_SX = ctpn7.Nam_SX FROM .Dbo.CTPN7 WITH(NOLOCK) WHERE #Report0.So_Khung = CTPN7.So_Khung AND CTpn7.Nam_SX <> 0
	UPDATE #Report0 SET Nam_SX = CDXEX.Nam_SX FROM .Dbo.CDXEX WITH(NOLOCK) WHERE #Report0.So_Khung = CDXEX.So_Khung AND cdxeX.Nam_SX <> 0
	UPDATE #Report0 SET Nam_SX = ctpn9.Nam_SX FROM .Dbo.CTPN9 WITH(NOLOCK) WHERE #Report0.So_Khung = CTPN9.So_Khung AND ctpn9.Nam_SX <> 0
	UPDATE #Report0 SET Ma_MauNT=a.Ma_mau_Nt FROM CT70BEX a WITH(NOLOCK) WHERE #Report0.So_Khung = a.So_Khung AND a.nxt='1'
	UPDATE #Report0 SET Ten_MauNT=a.Ten_mau FROM DmMauXeNt a WITH(NOLOCK) WHERE #Report0.Ma_MauNT = a.Ma_mau_Nt	
	UPDATE #Report0 SET User_Id = a.user_id FROM CT70BE a WITH(NOLOCK) WHERE #Report0.stt_rec = a.stt_rec
	UPDATE #Report0 SET User_Id = a.user_id FROM CT70BEX a WITH(NOLOCK) WHERE #Report0.stt_rec = a.stt_rec 
	UPDATE #Report0 SET User_name = a.comment FROM Userinfo a WITH(NOLOCK) WHERE #Report0.User_Id = a.user_id

	--- Tính lắp phụ kiện			
	SELECT So_Khung,Ma_Kx,SUM(Tien_NT) as Gia_LPK 
	INTO #LPK FROM .Dbo.CTPX6 
	WHERE (Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct2) 
		AND (@M_Ma_Kx  =N'' OR Ma_Kx = @M_Ma_Kx ) 
		AND (So_Khung IN (SELECT So_Khung FROM #Report0 GROUP BY So_Khung)) 
		AND (stt_rec IN (SELECT stt_rec FROM .Dbo.PHPX6 WHERE (PHPX6.Ma_Dvcs  = @M_Ma_Dvcs) 
		AND (PHPX6.Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct2)  AND (PHPX6.Ma_Post>='3')))			
	GROUP BY So_Khung,Ma_Kx
	--- Tính nhập phụ kiện			
	SELECT So_Khung,Ma_Kx,SUM(Tien_NT) as Gia_TPK 
	INTO #TPK FROM .Dbo.CTPN6 
	WHERE (Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct2) 
		AND (@M_Ma_Kx = N'' OR Ma_Kx = @M_Ma_Kx ) 
		AND (So_Khung IN (SELECT So_Khung FROM #Report0 GROUP BY So_Khung))
		AND (stt_rec IN (SELECT stt_rec FROM .Dbo.PhPN6 WHERE (Ma_Dvcs  = @M_Ma_Dvcs) 
		AND (Ngay_Ct BETWEEN @Ngay_Dau_Nam AND @M_Ngay_Ct2) AND (Ma_Post>='3')))	
	GROUP BY So_Khung,Ma_Kx		
	--> Update thông tin xếp xe, viết hóa đơn, tên hợp đồng
	UPDATE #Report0 SET Ma_hd = a.Ma_hd FROM dbo.BEXEPXE AS a WITH (NOLOCK) WHERE a.So_khung = #Report0.so_khung AND a.Ma_hd <>N''
	UPDATE #Report0 SET Tinh_trang  = N'Xe đã được ghép số khung'  WHERE Ma_hd <>N''
	UPDATE #Report0 SET Ten_hd = a.Ten_Kh,Ma_tvbh = a.Ma_hs_H FROM dbo.PHHDX AS a WITH (NOLOCK)  WHERE a.Ma_hd_H = #Report0.Ma_Hd AND #Report0.Ma_hd <>N''
	UPDATE #Report0 SET Ten_tvbh = a.Ten_HS FROM dbo.DMHS AS a WITH (NOLOCK)  WHERE a.Ma_hs = #Report0.Ma_tvbh AND #Report0.Ma_tvbh <>N''
	UPDATE #Report0 SET Ma_TTCP_HDX = a.Ma_TTCP_H FROM PHHDX a WITH(NOLOCK) WHERE #Report0.Ma_HD = a.Ma_HD_H AND #Report0.Ma_HD <> ''
	UPDATE #Report0 SET Ten_TTCP_HDX = a.Ten_TTCP FROM dmTTCP a WITH(NOLOCK) WHERE #Report0.Ma_TTCP_HDX = a.Ma_TTCP

	UPDATE #Report0 SET Note = a.Ghi_chu, Ngay_dong_thung = a.Ngay_hl FROM dbo.DsDoiMA_KX AS a WITH (NOLOCK) WHERE a.So_khung = #Report0.So_khung AND a.Ma_kx_new =N''
	
	UPDATE #Report0 SET Ma_kx = a.Ma_kx_new,Ma_mau = a.Ma_mau_new, Note =N'Xe đóng thùng từ xe cơ sở: ' + LTRIM(a.Ma_kx), Ngay_dong_thung = a.Ngay_hl FROM dbo.DsDoiMA_KX AS a WITH (NOLOCK) WHERE a.So_khung = #Report0.So_khung AND a.Ma_kx_new <>N''
	UPDATE #Report0 SET Ten_kx = a.Ten_KX FROM dbo.DMKX AS a WITH (NOLOCK) WHERE a.Ma_kx = #Report0.Ma_kx AND #Report0.Note <>N''
	UPDATE #Report0 SET Tinh_trang = N'Xe đã được viết hóa đơn', ngay_hdon = a.Ngay_ct FROM dbo.ct70be AS a WITH (NOLOCK) WHERE a.So_khung = #Report0.so_khung AND #Report0.Ma_dvcs = a.Ma_dvcs AND a.Ma_ct ='HDC'
	
	--> Stt_rec nhap
	UPDATE #Report0 SET Stt_Rec = a.Stt_rec FROM .Dbo.CT70BE a WITH (NOLOCK) WHERE a.Nxt = N'1' AND a.So_Khung = #Report0.So_Khung AND a.Ma_Dvcs = #Report0.Ma_Dvcs
	UPDATE #Report0 SET So_HD = a.So_Ct0,Ngay_HD = a.Ngay_Ct0 FROM .Dbo.PHPN3 a WHERE a.Stt_Rec = #Report0.Stt_Rec
	
	UPDATE #Report0 SET Ngay_ct = ctgt30.ngay_ct FROM dbo.Ctgt30  WHERE Ctgt30.stt_rec = #Report0.Stt_rec and #Report0.ngay_ct =N''
	-- Lấy ngày nhập bé nhất
	SELECT a.Ma_dvcs, a.so_khung,a.so_May, a.ma_kx, a.ma_mau, Min(a.ngay_ct) AS Ngay_ct INTO #NgaynhapMin FROM
	(SELECT Ma_dvcs,so_khung, so_may, ma_kx, Ma_mau, Min(Ngay_ct) AS ngay_ct FROM dbo.ct70be WHERE so_khung IN (SELECT So_khung FROM #Report0) AND ma_ct ='PN3' GROUP BY So_khung, so_may, ma_kx, Ma_mau,Ma_dvcs
	UNION ALL
	SELECT Ma_dvcs,so_khung, so_may, ma_kx, Ma_mau, Min(Ngay_nhap) AS ngay_ct FROM dbo.cdxex WHERE so_khung IN (SELECT So_khung FROM #Report0) GROUP BY So_khung, so_may, ma_kx, Ma_mau,Ma_dvcs
	) AS a GROUP BY a.So_khung, a.so_may, a.Ma_kx, a.Ma_mau,a.Ma_dvcs
	-- Update ngày nhập bé nhất
	UPDATE #Report0 SET Ngay_Ct = a.ngay_ct FROM dbo.#NgaynhapMin  AS a WHERE a.Ngay_Ct <>N''
		AND #Report0.So_khung=a.So_Khung AND a.ma_dvcs IN (SELECT ma_dvcs FROM @DsUnits)

	UPDATE #Report0 SET Thang_HD = + RIGHT(N'00'+LTRIM(RTRIM(STR(MONTH(Ngay_HD)))),2) + N'/' + LTRIM(RTRIM(STR(YEAR(Ngay_HD))))
	UPDATE #Report0 SET Thang_ct = + RIGHT(N'00'+LTRIM(RTRIM(STR(MONTH(Ngay_Ct)))),2) + N'/' + LTRIM(RTRIM(STR(YEAR(Ngay_Ct))))	
	
	UPDATE #Report0 SET Ngay_Ton = DATEDIFF(DD,Ngay_Ct,GETDATE()) WHERE Ngay_Ct <> N'19000101'
	
	UPDATE #Report0 SET Loai_Ton = N'T4' WHERE Ngay_Ton <= 30
	UPDATE #Report0 SET Loai_Ton = N'T3' WHERE Ngay_Ton <= 60 AND Ngay_Ton > 30
	UPDATE #Report0 SET Loai_Ton = N'T2' WHERE Ngay_Ton <= 90 AND Ngay_Ton > 60
	UPDATE #Report0 SET Loai_Ton = N'T1' WHERE Ngay_Ton > 90

	UPDATE #Report0 SET Ton_Dau = 0 WHERE Ton_Dau IS NULL
	UPDATE #Report0 SET Du_Dau = 0 WHERE Du_Dau IS NULL
	UPDATE #Report0 SET Du_Dau_Nt = 0 WHERE Du_Dau_Nt IS NULL
	UPDATE #Report0 SET Thue_NT = 0 WHERE Du_Dau_Nt IS NULL

	UPDATE #Report0 SET Sl_Nhap = 0 WHERE Sl_Nhap IS NULL
	UPDATE #Report0 SET Tien_Nhap = 0 WHERE Tien_Nhap IS NULL
	UPDATE #Report0 SET Tien_Nt_N = 0 WHERE Tien_Nt_N IS NULL

	UPDATE #Report0 SET Sl_Xuat = 0 WHERE Sl_Xuat IS NULL
	UPDATE #Report0 SET Tien_Xuat = 0 WHERE Tien_Xuat IS NULL
	UPDATE #Report0 SET Tien_Nt_X = 0 WHERE Tien_Nt_X IS NULL

	UPDATE #Report0 SET Ton_Cuoi = Ton_Dau + Sl_Nhap - Sl_Xuat
	UPDATE #Report0 SET Du_Cuoi = Du_Dau + Tien_Nhap - Tien_Xuat  + LPK_NT - TPK_NT
	UPDATE #Report0 SET Du_Cuoi_Nt = Du_Dau_nt + Tien_Nt_N - Tien_Nt_X	 + LPK_NT - TPK_NT
	UPDATE #Report0 SET T_TT = ROUND(Du_Cuoi,0) 
	
	---> Hangpt 23/10/20
	--SELECT * INTO #Report01 FROM #Report0 WHERE Ton_Cuoi > 0
	SELECT * INTO #Report00 FROM #Report0 WHERE 1=0
	EXECUTE [Dbo].[Cp_SysgroupByTable] '#Report0',N'#Report00 ',N'1=1','Ma_Dvcs,Ma_Kx, So_khung, So_may, ma_mau, ma_kho',N'',''	
	--- Update lại mã kho, trường hợp điều chuyển lòng vòng 21/12
	SELECT  ROW_NUMBER() OVER(PARTITION BY So_Khung ORDER BY ngay_CT DESC, so_ct DESC) STT, stt_rec, Ngay_ct, So_Khung, ma_kho,ma_khoN INTO #Kho0 FROM dbo.CT70BEX WITH (NOLOCK) WHERE nxt = '1'AND ma_Dvcs IN (SELECT ma_Dvcs FROM @DsUnits) AND EXISTS (SELECT TOP 1 1 FROM #Report0 WHERE #Report0.So_khung = CT70BEX.So_khung) AND ma_ct = 'PNX' ORDER BY ngay_ct DESC,so_ct DESC
	SELECT * INTO #Kho FROM #Kho0 WHERE STT = 1
	---
	SELECT MA_KX,So_khung, SUM(Ton_Cuoi) as Ton_Cuoi INTO #TONCUOI FROM #Report00 WHERE Ton_Cuoi <> 0  GROUP BY MA_KX,So_khung HAVING SUM(Ton_Cuoi)=0
	DELETE FROM #Report00 WHERE So_khung IN (SELECT So_khung FROM #TONCUOI)
	---
	UPDATE #Report00 SET Ma_kho =a.ma_kho FROM #Kho a WHERE #Report00.So_khung = a.So_Khung

	--> end hangpt
	----------------------------------------------------------------------------------------------------------	

	SELECT a.* ,N'CP_BESO1' as M_Cp_Detail INTO #Report FROM #Report00 AS a WHERE Ton_Cuoi > 0 
	SELECT TOP 0 * INTO #TotalAll FROM #Report WHERE 1=0
	SELECT TOP 0 * INTO #TotalKx FROM #Report WHERE 1=0
	SELECT TOP 0 * INTO #TotalLoai FROM #Report WHERE 1=0
	SET @Count = (SELECT COUNT(*) FROM #Report )
	SET @XE_Giucho = (SELECT COUNT(*) FROM #Report WHERE Tinh_trang <>N''); IF @XE_Giucho IS Null SET @XE_Giucho = 0
	
	EXECUTE [Dbo].[Cp_SysgroupByTable] '#Report',N'#TotalAll',N'1=1','',N'','' 
	EXECUTE [Dbo].[Cp_SysgroupByTable] '#Report',N'#TotalKx ',N'1=1','Ma_Kx',N'',''	
	EXECUTE [Dbo].[Cp_SysgroupByTable] '#Report',N'#TotalLoai ',N'1=1','Loai_Ton',N'',''	

	UPDATE #TotalAll SET Bold ='1',Ma_Mau ='',Ma_Kx ='',Ten_Kx =N'Tổng cộng: ' + CONVERT(NVARCHAR(5),@Count) + N' Xe/' + N'Số xe đã giữ chỗ: ' + CONVERT(NVARCHAR(10),@XE_Giucho) + N' xe',Ftag = '1',BackColor = N'Pink'
		,So_Khung = N'',So_May = N'',Ma_MauNT = N'',So_HD = N'',Ngay_Ct = N'',Thang_ct = '',Ngay_Ton = 0,Loai_Ton = N'', ten_kho =N'', Ma_kho =N'', Nam_sx =0, Ten_mau =N'', Ten_MauNT =N''
		, Tinh_trang =N'', Ma_hd=N'', Ten_HD=N'', Ten_tvbh =N'',Note =N'', Ngay_hdon =N'', Ngay_dong_thung =N'', Ma_TTCP_HDX = '', Ten_TTCP_HDX = ''
	UPDATE #TotalKx SET Bold ='1',Ma_Mau = '',Ma1= Ma_Kx,Ten_Kx = N'' + Ten_Kx + N' : '+ CONVERT(NVARCHAR(5),SL_XE) ,Ftag = '5' ,BackColor = N'YELLOW', Ten_MauNT =N''
		,So_Khung = N'',So_May = N'',Ma_MauNT = N'',So_HD = N'',Ngay_Ct = N'',Thang_ct = '',Ngay_Ton = 0,In_Ck = '0'
		, Tinh_trang =N'', Ma_hd=N'', Ten_HD=N'', Ten_tvbh =N'',Note =N'', Ngay_hdon =N'', Ngay_dong_thung =N'', Nam_SX = 0, Ma_TTCP_HDX = '', Ten_TTCP_HDX = ''
	UPDATE #TotalLoai SET Bold ='1',Ma_Mau = '',Ma1= Ma_Kx,Ftag = '3' ,BackColor = N'Cyan',Ma_Kx = '', ten_kho =N'', Ma_kho =N'', Ten_mau =N'', Ten_MauNT =N''
		,So_Khung = N'',So_May = N'',Ma_MauNT = N'',So_HD = N'',Ngay_Ct = N'',Thang_ct = '',Ngay_Ton = 0,In_Ck = '0'
		, Tinh_trang =N'', Ma_hd=N'', Ten_HD=N'', Ten_tvbh =N'',Note =N'', Ngay_hdon =N'', Ngay_dong_thung =N'', Nam_SX = 0, Ma_TTCP_HDX = '', Ten_TTCP_HDX = ''
	
	UPDATE #TotalLoai SET Ten_Kx = N'Tồn dưới 1 tháng' WHERE Loai_Ton = N'T4'
	UPDATE #TotalLoai SET Ten_Kx = N'Tồn từ 1 tháng đến dưới 2 tháng' WHERE Loai_Ton = N'T3'
	UPDATE #TotalLoai SET Ten_Kx = N'Tồn từ 2 tháng đến dưới 3 tháng' WHERE Loai_Ton = N'T2'
	UPDATE #TotalLoai SET Ten_Kx = N'Tồn từ 3 tháng trở lên' WHERE Loai_Ton = N'T1'
	
	----------------------------------------------------------------------------------------------------------
	UPDATE #Report0 SET Ten_Kx = Ten_Mau,Ma1 = Ma_Mau	
	INSERT INTO #Report SELECT * FROM #TotalAll

	INSERT INTO #Report SELECT * FROM #TotalLoai
	UPDATE #Report SET BackColor = N'YELLOW' WHERE Tinh_trang <>N''
	----------------------------------------------------------------------------------------------------------
	--UPDATE #Report SET Loai_Ton = N''	
	----------------------------------------------------------------------------------------------------------
	UPDATE #Report SET M_strPRDetail = @M_Ma_Kho + N'#' + Ma_Kx + N'#'  + Ma_Mau + N'#' + N'#' + CONVERT(NVARCHAR(8),@M_Ngay_Ct1,112)	+ N'#' + CONVERT(NVARCHAR(8),@M_Ngay_Ct2,112) + N'#' + @M_Loai_BC + N'#' +@M_Ma_Dvcs +'#'  + @M_User_Name						
	----------------------------------------------------------------------------------------------------------	
	SELECT * FROM #Report ORDER BY Loai_Ton,Ftag,Ma_Kx,Ma_Mau,So_Khung,So_May
	SET @Tu_Ngay = dbo.CF_GetFromdateToDate(@M_Ngay_Ct1,@M_Ngay_Ct2,@M_LAN)
	SELECT	* ,RTRIM(@Tu_Ngay) as Tu_Ngay,@M_Ngay_Ct1 as Ngay_Ct1,@M_Ngay_Ct2 as Ngay_Ct2,RTRIM(@Ten_Kho) as Ten_Kho	FROM #TotalAll			
	DROP TABLE #TotalKx
	DROP TABLE #TotalAll			
	----------------------------------------------------------------------------------------------------------		
	SET @M_Cp_Name = N'CP_BETONXE'
	EXECUTE Dbo.CP_SysGetHearMasterReport N'',@M_Cp_Name,@M_Loai_BC,@M_Ma_Dvcs,@M_User_Name
END 
