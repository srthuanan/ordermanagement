Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\Pham Thanh Nhan\Documents\ordermanagement"

' 1. Kiểm tra nếu chưa chạy thì khởi động server ngầm ẩn hoàn toàn (window style 0)
Set http = CreateObject("MSXML2.XMLHTTP")
On Error Resume Next
http.Open "GET", "http://localhost:8989/api/status", False
http.Send

If Err.Number <> 0 Or http.Status <> 200 Then
    WshShell.Run "python ricoh_monitor_server.py", 0, False
    WScript.Sleep 2000
End If
On Error GoTo 0

' 2. Mở trình duyệt web
WshShell.Run "http://localhost:8989", 1, False
