# MarkItUI - PowerShell Setup fuer Python und alle Konverter-Pakete
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MarkItUI - Python & Paket-Setup (PowerShell)          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

function Test-PythonCandidate {
    param([string]$Exe)
    if (-not (Test-Path $Exe)) { return $false }
    try {
        & $Exe -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Find-Python {
    $candidates = @()

    foreach ($base in @("$env:LOCALAPPDATA\Programs\Python", "$env:LOCALAPPDATA\Python", $env:ProgramFiles)) {
        if ($base -and (Test-Path $base)) {
            $candidates += Get-ChildItem -Path $base -Directory -Filter "Python*" -ErrorAction SilentlyContinue |
                ForEach-Object { Join-Path $_.FullName "python.exe" }
            $candidates += Get-ChildItem -Path $base -Directory -Filter "pythoncore-*" -ErrorAction SilentlyContinue |
                ForEach-Object { Join-Path $_.FullName "python.exe" }
        }
    }
    $candidates += "$env:LOCALAPPDATA\Python\bin\python.exe"

    # Neueste Version zuerst pruefen
    foreach ($exe in ($candidates | Sort-Object -Descending -Unique)) {
        if (Test-PythonCandidate $exe) { return @($exe) }
    }

    try {
        & py -3 -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) { return @("py", "-3") }
    } catch {}

    try {
        & python -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) { return @("python") }
    } catch {}

    return $null
}

function Invoke-Python {
    param([string[]]$PythonCmd, [string[]]$Arguments)
    & $PythonCmd[0] (@($PythonCmd[1..($PythonCmd.Count - 1)] | Where-Object { $_ }) + $Arguments)
}

$python = Find-Python

# --- Python bei Bedarf automatisch installieren -------------------------------
if (-not $python) {
    Write-Host "[INFO] Kein Python gefunden. Pruefe winget..." -ForegroundColor Yellow
    try {
        & winget --version 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[INFO] Installiere Python 3.12 (Benutzerkonto, keine Adminrechte noetig)..." -ForegroundColor Green
            & winget install --id Python.Python.3.12 -e --scope user --accept-source-agreements --accept-package-agreements
            $python = Find-Python
        }
    } catch {}
}

if (-not $python) {
    Write-Host ""
    Write-Host "[FEHLER] Kein funktionierendes Python gefunden!" -ForegroundColor Red
    Write-Host "Bitte Python 3.12 von https://www.python.org/downloads/ installieren" -ForegroundColor Red
    Write-Host "und im Installer 'Add python.exe to PATH' aktivieren." -ForegroundColor Red
    Read-Host "Enter zum Beenden"
    exit 1
}

Write-Host "[OK] Verwende Python: $($python -join ' ')" -ForegroundColor Green
Invoke-Python $python @("--version")
Write-Host ""

# --- pip sicherstellen --------------------------------------------------------
Write-Host "1. Pruefe pip..." -ForegroundColor Cyan
Invoke-Python $python @("-m", "pip", "--version") | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] pip fehlt - richte pip ein..." -ForegroundColor Yellow
    Invoke-Python $python @("-m", "ensurepip", "--upgrade")
}
Invoke-Python $python @("-m", "pip", "install", "--disable-pip-version-check", "--upgrade", "pip")

# --- Pakete gruppenweise installieren ----------------------------------------
Write-Host ""
Write-Host "2. Installiere Konverter-Pakete..." -ForegroundColor Cyan

$groups = @(
    @{ Name = "Basis-Konverter"; Packages = @("pdfplumber", "pypdfium2", "pdfminer.six", "mammoth", "python-docx", "python-pptx", "openpyxl", "xlrd") },
    @{ Name = "Text-Werkzeuge";  Packages = @("beautifulsoup4", "markdown", "pygments", "puremagic") },
    @{ Name = "MarkItDown";      Packages = @("markitdown[docx,pdf,pptx,xlsx,xls]") }
)

$failed = @()
foreach ($group in $groups) {
    Write-Host ""
    Write-Host "--- $($group.Name) ---" -ForegroundColor Cyan
    Invoke-Python $python (@("-m", "pip", "install", "--disable-pip-version-check", "--upgrade") + $group.Packages)

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[INFO] Wiederhole im Benutzerkonto (--user)..." -ForegroundColor Yellow
        Invoke-Python $python (@("-m", "pip", "install", "--disable-pip-version-check", "--user", "--upgrade") + $group.Packages)
        if ($LASTEXITCODE -ne 0) { $failed += $group.Name }
    }
}

# --- Diagnose -----------------------------------------------------------------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$worker = Join-Path $scriptDir "python_engine\markitdown_worker.py"
if (-not (Test-Path $worker)) { $worker = Join-Path $scriptDir "markitdown_worker.py" }

if (Test-Path $worker) {
    Write-Host ""
    Write-Host "3. Systemdiagnose..." -ForegroundColor Cyan
    Invoke-Python $python @($worker, "--doctor")
}

Write-Host ""
if ($failed.Count -eq 0) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  [ERFOLG] Alle Voraussetzungen sind installiert!       " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "[WARNUNG] Nicht installiert: $($failed -join ', ')" -ForegroundColor Yellow
    Write-Host "MarkItUI funktioniert trotzdem, solange die Basis-Konverter vorhanden sind." -ForegroundColor Yellow
}
Write-Host ""
