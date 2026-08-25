import { spawn, execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { ConversionRequest, ConversionResult, PythonEnvironmentStatus, InstallRequirementsResult } from '../shared/types';

export class ConverterBridge {
  private static cachedPythonPath: string | null = null;

  /**
   * Tests if a candidate python command or path can execute code properly
   * and is not the WindowsApps dummy stub.
   */
  private static isExecutablePython(cmd: string): boolean {
    try {
      const output = execSync(`"${cmd}" -c "import sys; print('OK')"`, {
        timeout: 3000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8'
      });
      return output.includes('OK');
    } catch {
      return false;
    }
  }

  /**
   * Searches for a working Python executable across all known Windows standard locations.
   */
  public static findPythonExecutable(customPath?: string): string {
    if (customPath && fs.existsSync(customPath) && this.isExecutablePython(customPath)) {
      return customPath;
    }

    if (this.cachedPythonPath && this.isExecutablePython(this.cachedPythonPath)) {
      return this.cachedPythonPath;
    }

    const localAppData = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates: string[] = [];

    // 1. Check LocalAppData/Python/pythoncore-* (newer standalone python setups)
    const pythonCoreDir = path.join(localAppData, 'Python');
    if (fs.existsSync(pythonCoreDir)) {
      try {
        const entries = fs.readdirSync(pythonCoreDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            candidates.push(path.join(pythonCoreDir, entry.name, 'python.exe'));
          }
        }
      } catch {}
      candidates.push(path.join(pythonCoreDir, 'bin', 'python.exe'));
    }

    // 2. Check LocalAppData/Programs/Python/Python*
    const localProgramsPython = path.join(localAppData, 'Programs', 'Python');
    if (fs.existsSync(localProgramsPython)) {
      try {
        const entries = fs.readdirSync(localProgramsPython, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            candidates.push(path.join(localProgramsPython, entry.name, 'python.exe'));
          }
        }
      } catch {}
    }

    // 3. Check Program Files / Python*
    for (const pf of [programFiles, programFilesX86]) {
      if (fs.existsSync(pf)) {
        try {
          const entries = fs.readdirSync(pf, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && entry.name.toLowerCase().startsWith('python')) {
              candidates.push(path.join(pf, entry.name, 'python.exe'));
            }
          }
        } catch {}
      }
    }

    // 4. Check Anaconda / Miniconda / Pyenv / Scoop / Chocolatey
    candidates.push(
      path.join(userProfile, 'miniconda3', 'python.exe'),
      path.join(userProfile, 'anaconda3', 'python.exe'),
      path.join(userProfile, '.pyenv', 'pyenv-win', 'bin', 'python.exe'),
      path.join(userProfile, 'scoop', 'apps', 'python', 'current', 'python.exe'),
      'C:\\tools\\python\\python.exe'
    );

    // 5. Test existing file paths first
    for (const cand of candidates) {
      if (fs.existsSync(cand) && this.isExecutablePython(cand)) {
        this.cachedPythonPath = cand;
        return cand;
      }
    }

    // 6. Test 'py -3' or 'py' launcher
    if (this.isExecutablePython('py')) {
      this.cachedPythonPath = 'py';
      return 'py';
    }

    // 7. Test 'python' in PATH (if verified)
    if (this.isExecutablePython('python')) {
      this.cachedPythonPath = 'python';
      return 'python';
    }

    // 8. Test 'python3' in PATH
    if (this.isExecutablePython('python3')) {
      this.cachedPythonPath = 'python3';
      return 'python3';
    }

    return 'python';
  }

  public static getWorkerScriptPath(): string {
    if (app.isPackaged) {
      const resourcePath = path.join(process.resourcesPath, 'python_engine', 'markitdown_worker.py');
      if (fs.existsSync(resourcePath)) {
        return resourcePath;
      }
      return path.join(__dirname, '..', 'python_engine', 'markitdown_worker.py');
    }
    return path.join(app.getAppPath(), 'python_engine', 'markitdown_worker.py');
  }

  public static getRequirementsPath(): string {
    if (app.isPackaged) {
      const resPath = path.join(process.resourcesPath, 'requirements.txt');
      if (fs.existsSync(resPath)) return resPath;
      const engineResPath = path.join(process.resourcesPath, 'python_engine', 'requirements.txt');
      if (fs.existsSync(engineResPath)) return engineResPath;
    }
    return path.join(app.getAppPath(), 'requirements.txt');
  }

  public static getSetupScriptPath(): string {
    if (app.isPackaged) {
      const resPath = path.join(process.resourcesPath, 'install_requirements.bat');
      if (fs.existsSync(resPath)) return resPath;
      const engineResPath = path.join(process.resourcesPath, 'python_engine', 'install_requirements.bat');
      if (fs.existsSync(engineResPath)) return engineResPath;
    }
    return path.join(app.getAppPath(), 'install_requirements.bat');
  }

  /**
   * Diagnostic environment check
   */
  public static async checkEnvironment(customPythonPath?: string): Promise<PythonEnvironmentStatus> {
    const pythonExe = this.findPythonExecutable(customPythonPath);
    const isWorking = this.isExecutablePython(pythonExe);

    if (!isWorking) {
      return {
        isReady: false,
        pythonFound: false,
        pythonVersion: '',
        pythonPath: pythonExe,
        installedPackages: [],
        missingPackages: ['python', 'markitdown', 'pdfplumber', 'mammoth', 'python-pptx', 'openpyxl'],
        hasMarkitdown: false,
        hasPdfplumber: false,
        hasMammoth: false,
        hasPptx: false,
        hasOpenpyxl: false,
        error: 'Kein funktionierendes Python gefunden. Bitte installiere Python oder führe das Setup-Skript aus.'
      };
    }

    const workerScript = this.getWorkerScriptPath();

    return new Promise((resolve) => {
      const args = pythonExe === 'py' ? ['-3', workerScript, '--doctor'] : [workerScript, '--doctor'];
      const child = spawn(pythonExe, args, {
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => { stdout += d.toString('utf-8'); });
      child.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });

      child.on('error', (err) => {
        resolve({
          isReady: false,
          pythonFound: true,
          pythonVersion: '',
          pythonPath: pythonExe,
          installedPackages: [],
          missingPackages: ['markitdown'],
          hasMarkitdown: false,
          hasPdfplumber: false,
          hasMammoth: false,
          hasPptx: false,
          hasOpenpyxl: false,
          error: `Fehler beim Ausführen der Diagnose: ${err.message}`
        });
      });

      child.on('close', (code) => {
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({
            isReady: Boolean(parsed.ready),
            pythonFound: true,
            pythonVersion: parsed.python_version || '',
            pythonPath: parsed.python_executable || pythonExe,
            installedPackages: parsed.installed_packages || [],
            missingPackages: parsed.missing_packages || [],
            hasMarkitdown: Boolean(parsed.has_markitdown),
            hasPdfplumber: Boolean(parsed.has_pdfplumber),
            hasMammoth: Boolean(parsed.has_mammoth),
            hasPptx: Boolean(parsed.has_pptx),
            hasOpenpyxl: Boolean(parsed.has_openpyxl),
            error: code !== 0 ? `Exit Code ${code}: ${stderr}` : undefined
          });
        } catch (e) {
          resolve({
            isReady: false,
            pythonFound: true,
            pythonVersion: '',
            pythonPath: pythonExe,
            installedPackages: [],
            missingPackages: ['markitdown'],
            hasMarkitdown: false,
            hasPdfplumber: false,
            hasMammoth: false,
            hasPptx: false,
            hasOpenpyxl: false,
            error: `Ungültige Diagnose-Antwort: ${stdout || stderr}`
          });
        }
      });
    });
  }

  /**
   * Installs required packages via pip in background
   */
  public static async installRequirements(customPythonPath?: string): Promise<InstallRequirementsResult> {
    const pythonExe = this.findPythonExecutable(customPythonPath);
    const reqPath = this.getRequirementsPath();

    const isWorking = this.isExecutablePython(pythonExe);
    if (!isWorking) {
      return {
        success: false,
        log: '',
        error: 'Python wurde nicht gefunden. Bitte installiere Python von python.org oder führe install_requirements.bat aus.'
      };
    }

    return new Promise((resolve) => {
      const pipArgs = pythonExe === 'py'
        ? ['-3', '-m', 'pip', 'install', '--upgrade', 'pip']
        : ['-m', 'pip', 'install', '--upgrade', 'pip'];

      const installArgs = pythonExe === 'py'
        ? (fs.existsSync(reqPath)
          ? ['-3', '-m', 'pip', 'install', '-r', reqPath]
          : ['-3', '-m', 'pip', 'install', 'markitdown', 'pdfplumber', 'pypdfium2', 'pdfminer.six', 'mammoth', 'python-pptx', 'openpyxl', 'beautifulsoup4', 'puremagic', 'markdown', 'pygments'])
        : (fs.existsSync(reqPath)
          ? ['-m', 'pip', 'install', '-r', reqPath]
          : ['-m', 'pip', 'install', 'markitdown', 'pdfplumber', 'pypdfium2', 'pdfminer.six', 'mammoth', 'python-pptx', 'openpyxl', 'beautifulsoup4', 'puremagic', 'markdown', 'pygments']);

      let fullLog = '';

      // 1. Upgrade pip then install requirements
      const child = spawn(pythonExe, installArgs, {
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });

      child.stdout.on('data', (d) => { fullLog += d.toString('utf-8'); });
      child.stderr.on('data', (d) => { fullLog += d.toString('utf-8'); });

      child.on('error', (err) => {
        resolve({
          success: false,
          log: fullLog,
          error: `Installationsprozess fehlgeschlagen: ${err.message}`
        });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            log: fullLog
          });
        } else {
          resolve({
            success: false,
            log: fullLog,
            error: `Pip-Installation mit Fehlercode ${code} beendet.`
          });
        }
      });
    });
  }

  /**
   * Opens the install_requirements.bat in a visible terminal window
   */
  public static async openSetupScript(): Promise<boolean> {
    const scriptPath = this.getSetupScriptPath();
    if (!fs.existsSync(scriptPath)) {
      return false;
    }

    try {
      exec(`start "MarkItUI Prerequisites Setup" cmd.exe /k "${scriptPath}"`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts a document to Markdown
   */
  public static async convert(req: ConversionRequest, customPythonPath?: string): Promise<ConversionResult> {
    const pythonExe = this.findPythonExecutable(customPythonPath);
    const workerScript = this.getWorkerScriptPath();

    if (!fs.existsSync(req.filePath)) {
      return {
        success: false,
        markdown: '',
        error: `Die Datei existiert nicht: ${req.filePath}`,
        fileName: path.basename(req.filePath)
      };
    }

    const isWorking = this.isExecutablePython(pythonExe);
    if (!isWorking) {
      return {
        success: false,
        markdown: '',
        error: `Python wurde nicht gefunden oder ist nicht konfiguriert. Bitte öffne die Einstellungen und installiere die Voraussetzungen oder führe install_requirements.bat aus.`,
        fileName: path.basename(req.filePath)
      };
    }

    return new Promise((resolve) => {
      const inputPayload = JSON.stringify({
        file_path: req.filePath,
        add_frontmatter: req.addFrontmatter ?? true,
        tags: req.tags || ['schule', 'itslearning'],
        subject: req.subject || '',
        title: req.title || ''
      });

      const spawnArgs = pythonExe === 'py'
        ? ['-3', workerScript, '--json-input']
        : [workerScript, '--json-input'];

      const child = spawn(pythonExe, spawnArgs, {
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString('utf-8');
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString('utf-8');
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          markdown: '',
          error: `Fehler beim Ausführen von Python (${pythonExe}): ${err.message}. Bitte installiere die Voraussetzungen über die Einstellungen oder das Terminal.`,
          fileName: path.basename(req.filePath)
        });
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdoutData) {
          const isModuleError = stderrData.includes('No module named') || stderrData.includes('ImportError');
          const errorMsg = isModuleError
            ? `Fehlende Python-Pakete erkannt:\n${stderrData}\n\nBitte installiere die Voraussetzungen mit einem Klick in den Einstellungen oder über 'install_requirements.bat'.`
            : `MarkItUI Konvertierungsfehler (Exit Code ${code}):\n${stderrData || 'Unbekannter Fehler'}`;

          resolve({
            success: false,
            markdown: '',
            error: errorMsg,
            fileName: path.basename(req.filePath)
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve({
            success: parsed.success,
            markdown: parsed.markdown || '',
            error: parsed.error || null,
            fileName: parsed.file_name || path.basename(req.filePath),
            charCount: parsed.char_count,
            engineUsed: parsed.engine_used
          });
        } catch (parseErr) {
          resolve({
            success: false,
            markdown: '',
            error: `Ungültige Ausgabe vom Konvertierer: ${stdoutData || stderrData || (parseErr as Error).message}`,
            fileName: path.basename(req.filePath)
          });
        }
      });

      // Write payload to stdin and end
      try {
        child.stdin.write(inputPayload, 'utf-8');
        child.stdin.end();
      } catch (e) {
        // Child process may have exited immediately
      }
    });
  }
}
