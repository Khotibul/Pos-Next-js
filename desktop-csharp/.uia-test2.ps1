param([string]$ExePath = 'F:\Website Js\Pos-Next-js\desktop-csharp\PosquDesktop\bin\Release\net8.0-windows\PosquDesktop.exe')
$ErrorActionPreference = 'Stop'
$exe = $ExePath
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
'@ -Name W2 -Namespace U2 | Out-Null
[U2.W2]::SetProcessDPIAware() | Out-Null

$p = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 5
$p.Refresh()
if ($p.HasExited) { Write-Output 'app exited early'; exit 1 }
$h = $p.MainWindowHandle
[U2.W2]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 600

$win = [System.Windows.Automation.AutomationElement]::FromHandle($h)
$byId = { param($id) New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id) }

function Click([double]$x, [double]$y) {
    [U2.W2]::SetCursorPos([int]$x, [int]$y) | Out-Null
    Start-Sleep -Milliseconds 250
    [U2.W2]::mouse_event(0x02, 0, 0, 0, [UIntPtr]::Zero) | Out-Null
    Start-Sleep -Milliseconds 120
    [U2.W2]::mouse_event(0x04, 0, 0, 0, [UIntPtr]::Zero) | Out-Null
    Start-Sleep -Milliseconds 500
}

$ae = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (& $byId 'EmailInput'))
if (-not $ae) { Write-Output 'EMAIL NOT FOUND'; $p.Kill(); exit 1 }
$r = $ae.Current.BoundingRectangle
Click ($r.X + [int]($r.Width / 2)) ($r.Y + [int]($r.Height / 2))
[System.Windows.Forms.SendKeys]::SendWait('^a')
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait('user@test.com')
Start-Sleep -Milliseconds 400
$vp = $ae.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
Write-Output ("email=[" + $vp.Current.Value + "] focus=" + $ae.Current.HasKeyboardFocus)

$pw = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (& $byId 'PasswordInput'))
$pr = $pw.Current.BoundingRectangle
Click ($pr.X + [int]($pr.Width / 2)) ($pr.Y + [int]($pr.Height / 2))
[System.Windows.Forms.SendKeys]::SendWait('rahasia123')
Start-Sleep -Milliseconds 500
Write-Output ("pwFocus=" + $pw.Current.HasKeyboardFocus)

# submit via Enter (IsDefault button) -> local validation distinguishes empty vs filled password
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 5

$cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Text)
$texts = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
foreach ($t in $texts) {
    $n = $t.Current.Name
    if ($n) { Write-Output ("TEXT: " + $n) }
}
$p.Refresh()
Write-Output ("exited=" + $p.HasExited + " title=[" + $p.MainWindowTitle + "]")
if ($p.HasExited -eq $false) { $p.Kill() }