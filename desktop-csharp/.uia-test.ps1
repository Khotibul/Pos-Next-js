$ErrorActionPreference = 'Stop'
$exe = 'F:\Website Js\Pos-Next-js\desktop-csharp\PosquDesktop\bin\Release\net8.0-windows\PosquDesktop.exe'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
'@ -Name W -Namespace U | Out-Null
[U.W]::SetProcessDPIAware() | Out-Null

$p = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 5
$p.Refresh()
if ($p.HasExited) { Write-Output 'app exited early'; exit 1 }
$h = $p.MainWindowHandle
Write-Output "handle=$h title=[$($p.MainWindowTitle)]"
[U.W]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 600

$win = [System.Windows.Automation.AutomationElement]::FromHandle($h)
$byId = { param($id) New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id) }
$ae = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (& $byId 'EmailInput'))
if (-not $ae) { Write-Output 'EMAIL NOT FOUND'; exit 1 }
$vp = $ae.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
Write-Output ("winRect=" + $win.Current.BoundingRectangle)

function Click([double]$x, [double]$y) {
    [U.W]::SetCursorPos([int]$x, [int]$y) | Out-Null
    Start-Sleep -Milliseconds 250
    [U.W]::mouse_event(0x02, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 120
    [U.W]::mouse_event(0x04, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 500
}

$r = $ae.Current.BoundingRectangle
# 1. click blank area of the card (triggers DragMove path)
$w0 = $win.Current.BoundingRectangle
Click ($w0.X + 900) ($w0.Y + 600)
Write-Output ("afterBlankClick winRect=" + $win.Current.BoundingRectangle)

# 2. click the "Email" label (TextBlock -> drag path) then the field
$lbl = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, 'Email')))
if ($lbl) {
    $lr = $lbl.Current.BoundingRectangle
    Click ($lr.X + 10) ($lr.Y + [int]($lr.Height / 2))
    Write-Output ("afterLabelClick winRect=" + $win.Current.BoundingRectangle)
}

# 3. click the email field and type
Click ($r.X + [int]($r.Width / 2)) ($r.Y + [int]($r.Height / 2))
Write-Output ("emailFocus=" + $ae.Current.HasKeyboardFocus)
[System.Windows.Forms.SendKeys]::SendWait('user@test.com')
Start-Sleep -Milliseconds 600
Write-Output ("emailAfterType=[" + $vp.Current.Value + "] focus=" + $ae.Current.HasKeyboardFocus)

# 4. password field
$pw = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (& $byId 'PasswordInput'))
$pvpObj = $null
$hasPvp = $pw.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pvpObj)
$pr = $pw.Current.BoundingRectangle
Click ($pr.X + [int]($pr.Width / 2)) ($pr.Y + [int]($pr.Height / 2))
Write-Output ("pwFocus=" + $pw.Current.HasKeyboardFocus)
[System.Windows.Forms.SendKeys]::SendWait('rahasia123')
Start-Sleep -Milliseconds 600
$pwVal = 'n/a'
if ($hasPvp) { $pwVal = $pvpObj.Value }
Write-Output ("pwAfterType=[" + $pwVal + "] focus=" + $pw.Current.HasKeyboardFocus)

# 5. checkbox + server settings button still reachable
$btn = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, 'Pengaturan server')))
Write-Output ("serverBtnFound=" + ($null -ne $btn))

Write-Output ("finalWinRect=" + $win.Current.BoundingRectangle)
$p.Kill()