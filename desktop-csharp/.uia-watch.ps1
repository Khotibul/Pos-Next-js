$exe = 'F:\Website Js\Pos-Next-js\desktop-csharp\PosquDesktop\bin\Release\net8.0-windows\PosquDesktop.exe'
$p = Start-Process -FilePath $exe -PassThru
$out = @()
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    $p.Refresh()
    $out += ("t=$i exited=" + $p.HasExited + " title=[" + $p.MainWindowTitle + "]")
}
$out | ForEach-Object { Write-Output $_ }
if ($p.HasExited) { Write-Output ("exitCode=" + $p.ExitCode) }
$procs = @(Get-Process | Where-Object { $_.ProcessName -like '*osqu*' })
Write-Output ("remaining=" + $procs.Count)
if ($p.HasExited -eq $false) { $p.Kill() }