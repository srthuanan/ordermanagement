param(
    [Parameter(Mandatory=$true)]
    [string]$OutPath
)

try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
    Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
    
    # 1. Kiểm tra hình ảnh trực tiếp trong Clipboard
    if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
        $img = [System.Windows.Forms.Clipboard]::GetImage()
        if ($img -ne $null) {
            $bmp = New-Object System.Drawing.Bitmap($img)
            $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $w = $bmp.Width
            $h = $bmp.Height
            $bmp.Dispose()
            $img.Dispose()
            Write-Host "OK:$($w)x$($h)"
            exit 0
        }
    }

    # 2. Kiểm tra danh sách file được sao chép (FileDropList)
    if ([System.Windows.Forms.Clipboard]::ContainsFileDropList()) {
        $files = [System.Windows.Forms.Clipboard]::GetFileDropList()
        foreach ($f in $files) {
            try {
                $testImg = [System.Drawing.Image]::FromFile($f)
                $w = $testImg.Width
                $h = $testImg.Height
                $testImg.Dispose()
                Copy-Item -Path $f -Destination $OutPath -Force
                Write-Host "OK:$($w)x$($h)"
                exit 0
            } catch {}
        }
    }
} catch {
    Write-Host "ERROR:$_"
    exit 1
}

Write-Host "NO_IMAGE"
exit 0
