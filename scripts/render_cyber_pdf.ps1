param(
    [string]$SttRec = "A000033691TD4",
    [string]$VoucherType = "TD4",
    [string]$UserName = "02.NHANPT",
    [string]$PaperSize = "A4",
    [string]$OutFile = ""
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

$report.RegData("CyberDataSource", $ds)
$report.Dictionary.Synchronize()

# Xử lý khổ giấy nếu người dùng chọn A5
if ($PaperSize -eq "A5" -and $report.Pages.Count -gt 0) {
    $page = $report.Pages[0]
    $page.PaperSize = [System.Drawing.Printing.PaperKind]::A5
    $page.PageWidth = 148
    $page.PageHeight = 210
}

$report.Render($false)

$projectDir = Split-Path -Parent $PSScriptRoot
if (-not $OutFile) {
    $outDir = Join-Path $projectDir "public\cyber_pdfs"
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    $cleanStt = $SttRec -replace '[^a-zA-Z0-9_\-]', '_'
    $OutFile = Join-Path $outDir "$cleanStt.pdf"
}

$report.ExportDocument([Stimulsoft.Report.StiExportFormat]::Pdf, $OutFile)

Write-Output $OutFile
