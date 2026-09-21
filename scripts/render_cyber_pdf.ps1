param(
    [string]$SttRec = "A000033691TD4",
    [string]$VoucherType = "TD4",
    [string]$UserName = "02.NHANPT",
    [string]$PaperSize = "A4",
    [string]$OutFile = "",
    [string]$IncludeSignatures = "true"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$cyberPath = "D:\CyberSoft\CYBNET9_VANDAO"
if (-not (Test-Path $cyberPath)) {
    Write-Error "Khong tim thay thu muc CyberSoft tai $cyberPath"
    exit 1
}

Add-Type -Path "$cyberPath\Stimulsoft.Base.dll"
Add-Type -Path "$cyberPath\Stimulsoft.Report.dll"

$connStr = "Server=SQLVanDao.Cybersoft.com.vn,7521;Database=CyberAppGolden_VanDao;User Id=cyber_vandao;Password=HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv;Application Name=CyberAppGolden;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

$mrtFile = ""
$cmd = $conn.CreateCommand()

if ($VoucherType -eq "TD4") {
    $mrtFile = "$cyberPath\Repo\TD400.mrt"
    $cmd.CommandText = "EXEC CP_PrintTD4 @M_Stt_Rec = '$SttRec', @M_Id = '1', @M_User_Name = '$UserName'"
} elseif ($VoucherType -eq "DNX") {
    $mrtFile = "$cyberPath\Repo\PXX00.mrt"
    $cmd.CommandText = "EXEC CP_PrintDNX @M_Stt_Rec = '$SttRec', @M_Id = '1', @M_User_Name = '$UserName'"
} else {
    $mrtFile = "$cyberPath\Repo\TD400.mrt"
    $cmd.CommandText = "EXEC CP_PrintTD4 @M_Stt_Rec = '$SttRec', @M_Id = '1', @M_User_Name = '$UserName'"
}

$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$ds = New-Object System.Data.DataSet
$adapter.Fill($ds) | Out-Null
$conn.Close()

if ($ds.Tables.Count -ge 3) {
    $ds.Tables[1].TableName = "Table0"
    $ds.Tables[2].TableName = "Table1"
} elseif ($ds.Tables.Count -ge 2) {
    $ds.Tables[0].TableName = "Table0"
    $ds.Tables[1].TableName = "Table1"
}

$report = New-Object Stimulsoft.Report.StiReport
$report.Load($mrtFile)

if ($report.Dictionary.Variables.Contains("M_TEN_CTY")) {
    $report.Dictionary.Variables["M_TEN_CTY"].Value = "CÔNG TY TNHH MINH ĐẠO PHÁT"
}
if ($report.Dictionary.Variables.Contains("M_DIA_CHI")) {
    $report.Dictionary.Variables["M_DIA_CHI"].Value = "Tổ dân phố Cam Giá 2, Phường Gia Sàng, Tỉnh Thái Nguyên, Việt Nam"
}

# Sửa tiêu đề cho phiếu DNX
if ($VoucherType -eq "DNX") {
    $titleComp = $report.GetComponentByName("Text2")
    if ($titleComp) {
        $titleComp.Text = "ĐỀ NGHỊ XUẤT XE"
    }
}

# Xử lý khổ giấy nếu người dùng chọn A5
if ($PaperSize -eq "A5" -and $report.Pages.Count -gt 0) {
    $page = $report.Pages[0]
    $page.PaperSize = [System.Drawing.Printing.PaperKind]::A5
    $page.PageWidth = 148
    $page.PageHeight = 210
}

# Chèn chữ ký vào band chứa tương ứng TRƯỚC KHI Render
if ($IncludeSignatures -eq "true" -or $IncludeSignatures -eq "1" -or $IncludeSignatures -eq $true) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectDir = Split-Path -Parent $scriptDir
    $sig1Path = Join-Path $projectDir "public\pictures\chu_ky_nguoi_de_nghi.png"
    $sig2Path = Join-Path $projectDir "public\pictures\chu_ky_phu_trach.png"

    if ($VoucherType -eq "DNX") {
        $footer = $report.GetComponentByName("FooterBand")
        if ($footer) {
            $footer.Height = 2.7

            # Chữ ký 1: Người đề nghị (Căn giữa theo Text28 & Text31: Left=0.3, Width=2.8 => Center=1.70)
            if (Test-Path $sig1Path) {
                $img1 = New-Object Stimulsoft.Report.Components.StiImage
                $img1.Name = "SigImageNguoiDeNghi"
                $img1.Left = 0.3
                $img1.Top = 0.88
                $img1.Width = 2.8
                $img1.Height = 1.35
                $img1.File = $sig1Path
                $img1.Stretch = $true
                $img1.AspectRatio = $true
                $img1.HorAlignment = [Stimulsoft.Base.Drawing.StiHorAlignment]::Center
                $img1.VertAlignment = [Stimulsoft.Base.Drawing.StiVertAlignment]::Top
                $footer.Components.Add($img1)
            }

            # Chữ ký 2: Phụ trách chi nhánh - Tăng kích thước lớn hơn
            if (Test-Path $sig2Path) {
                $img2 = New-Object Stimulsoft.Report.Components.StiImage
                $img2.Name = "SigImagePhuTrach"
                $img2.Left = 6.9
                $img2.Top = 0.85
                $img2.Width = 3.8
                $img2.Height = 1.70
                $img2.File = $sig2Path
                $img2.Stretch = $true
                $img2.AspectRatio = $true
                $img2.HorAlignment = [Stimulsoft.Base.Drawing.StiHorAlignment]::Center
                $img2.VertAlignment = [Stimulsoft.Base.Drawing.StiVertAlignment]::Top
                $footer.Components.Add($img2)
            }
        }
    }
}

$report.RegData("CyberDataSource", $ds)
$report.Dictionary.Synchronize()
$report.Render($false)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir
if (-not $OutFile) {
    $tempDir = [System.IO.Path]::GetTempPath()
    $cleanStt = $SttRec -replace '[^a-zA-Z0-9_\-]', '_'
    $OutFile = Join-Path $tempDir "cyber_preview_${cleanStt}_$([guid]::NewGuid().ToString().Substring(0,8)).pdf"
} else {
    if (-not [System.IO.Path]::IsPathRooted($OutFile)) {
        $OutFile = Join-Path $projectDir $OutFile
    }
    $OutFile = [System.IO.Path]::GetFullPath($OutFile)
    $parentDir = Split-Path -Parent $OutFile
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
}

$report.ExportDocument([Stimulsoft.Report.StiExportFormat]::Pdf, $OutFile)

Write-Output $OutFile
