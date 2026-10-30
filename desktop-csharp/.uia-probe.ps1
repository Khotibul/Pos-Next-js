param([string]$ExePath = 'F:\Website Js\Pos-Next-js\desktop-csharp\PosquDesktop\bin\Release\net8.0-windows\PosquDesktop.exe')

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
[DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
'@ -Name W3 -Namespace U3 | Out-Null
[U3.W3]::SetProcessDPIAware() | Out-Null

$p = Start-Process -FilePath $ExePath -PassThru
Start-Sleep -Seconds 6
$p.Refresh()
if ($p.HasExited) { Write-Output 'APP EXITED EARLY'; exit 1 }
$h = $p.MainWindowHandle
Write-Output ("WINDOW title=[" + $p.MainWindowTitle + "]")
[U3.W3]::SetWindowPos($h, [IntPtr]::Zero, 0, 0, 1280, 820, 0x0040) | Out-Null
[U3.W3]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 500

$win = [System.Windows.Automation.AutomationElement]::FromHandle($h)

function Click-Element([System.Windows.Automation.AutomationElement]$el) {
    $invoke = $null
    if ($el.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) {
        $invoke.Invoke()
        Start-Sleep -Milliseconds 1200
        return
    }
    $r = $el.Current.BoundingRectangle
    if ($r.Width -le 0) { Write-Output ("  (skip zero-size element: " + $el.Current.Name + ")"); return }
    $x = [int]($r.X + $r.Width / 2)
    $y = [int]($r.Y + $r.Height / 2)
    [U3.W3]::SetCursorPos($x, $y) | Out-Null
    Start-Sleep -Milliseconds 250
    [U3.W3]::mouse_event(0x02, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 120
    [U3.W3]::mouse_event(0x04, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 900
}

function Find-ByName([string]$name) {
    $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $name)
    return $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
}

function Dump-Labels {
    $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants,
        (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Text)))
    foreach ($t in $all) {
        $n = $t.Current.Name
        if ($n -and $n.Length -lt 60 -and $n -match '\d|Terjadi|Gagal|offline|Online|Sinkron') {
            $r = $t.Current.BoundingRectangle
            Write-Output ("  TEXT y=" + [int]$r.Y + " x=" + [int]$r.X + " [" + $n + "]")
        }
    }
}

$targets = @('Produk', 'Kasir / POS', 'Dashboard')
foreach ($target in $targets) {
    $nav = Find-ByName $target
    if (-not $nav) { Write-Output ("NAV NOT FOUND: " + $target); continue }
    Write-Output ("=== PAGE " + $target + " type=" + $nav.Current.ControlType.ProgrammaticName + " rect=" + $nav.Current.BoundingRectangle + " ===")
    Click-Element $nav
    Start-Sleep -Seconds 4

    $grids = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants,
        (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::DataGrid)))
    Write-Output ("  GRIDS=" + $grids.Count)
    foreach ($g in $grids) {
        $rows = $g.FindAll([System.Windows.Automation.TreeScope]::Children,
            (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                [System.Windows.Automation.ControlType]::DataItem)))
        Write-Output ("    GRID rows=" + $rows.Count)
        if ($rows.Count -gt 0) {
            for ($i = 0; $i -lt [Math]::Min(3, $rows.Count); $i++) {
                $cells = $rows[$i].FindAll([System.Windows.Automation.TreeScope]::Descendants,
                    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                        [System.Windows.Automation.ControlType]::Text)))
                $vals = @()
                foreach ($c in $cells) { if ($c.Current.Name) { $vals += $c.Current.Name } }
                Write-Output ("      ROW " + $i + ": " + ($vals -join ' | '))
            }
        }
    }
    Dump-Labels
}

if (-not $p.HasExited) { $p.Kill() }
