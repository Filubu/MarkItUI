# MarkItUI - PowerShell Prerequisites Installer
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MarkItUI - Python & Prerequisites Setup (PowerShell)  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$pythonCmd = $null

# 1. Search LocalAppData Python
$localAppData = $env:LOCALAPPDATA
if ($localAppData) {
    # Check Python/pythoncore-*
    $pythonCores = Get-ChildItem -Path "$localAppData\Python" -Directory -Filter "pythoncore-*" -ErrorAction SilentlyContinue
    foreach ($dir in $pythonCores) {
        $exe = Join-Path $dir.FullName "python.exe"
        if (Test-Path $exe) {
            try {
                & $exe -c "import sys" 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $pythonCmd = $exe
                    break
                }
            } catch {}
        }
    }

    if (-not $pythonCmd) {
        $legacyPath = "$localAppData\Python\bin\python.exe"
        if (Test-Path $legacyPath) {
            $pythonCmd = $legacyPath
        }
    }

    if (-not $pythonCmd) {
        $programs = Get-ChildItem -Path "$localAppData\Programs\Python" -Directory -Filter "Python*" -ErrorAction SilentlyContinue
        foreach ($dir in $programs) {
            $exe = Join-Path $dir.FullName "python.exe"
            if (Test-Path $exe) {
                try {
                    & $exe -c "import sys" 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        $pythonCmd = $exe
                        break
                    }
                } catch {}
            }
        }
    }
}

# 2. Search Program Files
if (-not $pythonCmd) {
    $pf = $env:ProgramFiles
    if ($pf) {
        $pfPythons = Get-ChildItem -Path $pf -Directory -Filter "Python*" -ErrorAction SilentlyContinue
        foreach ($dir in $pfPythons) {
            $exe = Join-Path $dir.FullName "python.exe"
            if (Test-Path $exe) {
                try {
                    & $exe -c "import sys" 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        $pythonCmd = $exe
                        break
                    }
                } catch {}
            }
        }
    }
}

# 3. Check 'py -3' launcher
if (-not $pythonCmd) {
    try {
        & py -3 -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = "py -3"
        }
    } catch {}
}

# 4. Check 'python' in PATH (ensure not WindowsApps stub)
if (-not $pythonCmd) {
    try {
        & python -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = "python"
        }
    } catch {}
}

# 5. Winget fallback
if (-not $pythonCmd) {
    Write-Host "[INFO] Kein Python gefunden. Prüfe winget..." -ForegroundColor Yellow
    try {
        $wingetVer = & winget --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[INFO] Installiere Python 3.12 via winget..." -ForegroundColor Green
            & winget install Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
            $pythonCmd = "py -3"
        }
    } catch {}
}

if (-not $pythonCmd) {
    Write-Host ""
    Write-Host "[FEHLER] Kein funktionierendes Python gefunden!" -ForegroundColor Red
    Write-Host "Bitte installiere Python von https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "und aktiviere 'Add Python to PATH'." -ForegroundColor Red
    Read-Host "Drücke Enter zum Beenden..."
    exit 1
}

Write-Host "[OK] Verwende Python: $pythonCmd" -ForegroundColor Green
Write-Host ""

# Update pip
Write-Host "1. Aktualisiere pip..." -ForegroundColor Cyan
if ($pythonCmd -eq "py -3") {
    & py -3 -m pip install --upgrade pip
} else {
    & $pythonCmd -m pip install --upgrade pip
}

Write-Host ""
Write-Host "2. Installiere Konverter-Pakete..." -ForegroundColor Cyan
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$reqFile = Join-Path $scriptDir "requirements.txt"

if (Test-Path $reqFile) {
    if ($pythonCmd -eq "py -3") {
        & py -3 -m pip install -r $reqFile
    } else {
        & $pythonCmd -m pip install -r $reqFile
    }
} else {
    $packages = @("markitdown", "pdfplumber", "pypdfium2", "pdfminer.six", "mammoth", "python-pptx", "openpyxl", "beautifulsoup4", "puremagic", "markdown", "pygments")
    if ($pythonCmd -eq "py -3") {
        & py -3 -m pip install $packages
    } else {
        & $pythonCmd -m pip install $packages
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  [ERFOLG] Alle Voraussetzungen erfolgreich installiert! " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARNUNG] Bei der Installation sind Fehler aufgetreten." -ForegroundColor Yellow
}

Write-Host ""
