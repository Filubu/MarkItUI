import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import { app } from 'electron';
import {
  ConversionRequest,
  ConversionResult,
  PythonEnvironmentStatus,
  InstallRequirementsResult,
  InstallProgressEvent,
  EnsurePythonResult
} from '../shared/types';

/** Ein aufrufbares Python-Ziel (z. B. "C:\\...\\python.exe" oder der Launcher "py -3"). */
interface PythonTarget {
  command: string;
  baseArgs: string[];
  /** Anzeigename / erkannter sys.executable */
  display: string;
  version?: [number, number, number];
  /** Läuft dieses Python in einem virtuellen Environment? */
  inVenv?: boolean;
}

interface ProbeResult {
  ok: boolean;
  version?: [number, number, number];
  executable?: string;
  inVenv?: boolean;
}

/** Marker, mit dem der Worker seine JSON-Antwort einrahmt (schützt vor Fremdausgaben auf stdout). */
const JSON_BEGIN = '@@MARKITUI_JSON_BEGIN@@';
const JSON_END = '@@MARKITUI_JSON_END@@';
/** Der Worker meldet auf stderr, welche Engine er gerade startet. */
const ENGINE_MARKER = '@@MARKITUI_ENGINE@@';

/** Pakete, die die App zwingend braucht – bewusst in Gruppen, damit ein Fehler nicht alles abbricht. */
const PACKAGE_GROUPS: Array<{ name: string; packages: string[]; required: boolean }> = [
  {
    name: 'Basis-Konverter (PDF, Word, PowerPoint, Excel)',
    packages: [
      'pdfplumber>=0.11.0',
      'pypdfium2>=4.30.0',
      'pdfminer.six>=20231228',
      'mammoth>=1.8.0',
      'python-docx>=1.1.0',
      'python-pptx>=1.0.0',
      'openpyxl>=3.1.0',
      'xlrd>=2.0.1'
    ],
    required: true
  },
  {
    name: 'Text- & Markdown-Werkzeuge',
    packages: ['beautifulsoup4>=4.12.0', 'markdown>=3.5.0', 'pygments>=2.17.0', 'puremagic>=1.20'],
    required: true
  },
  {
    name: 'MarkItDown-Engine (Microsoft)',
    // Ohne Extras kann MarkItDown 0.1.x weder PDF noch Office-Dateien lesen.
    packages: ['markitdown[docx,pdf,pptx,xlsx,xls]>=0.1.0'],
    required: false
  }
];

/** Fallback, falls die Installation von markitdown mit Extras scheitert (z. B. sehr neue Python-Version). */
const MARKITDOWN_FALLBACK = ['markitdown'];

/** Winget-Paket und Direkt-Download, falls auf dem Notebook noch gar kein Python existiert. */
const WINGET_PACKAGE = 'Python.Python.3.12';
const PYTHON_INSTALLER_URL =
  'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe';
const PYTHON_INSTALLER_URL_X86 =
  'https://www.python.org/ftp/python/3.12.10/python-3.12.10.exe';

export type ProgressReporter = (event: InstallProgressEvent) => void;

export class ConverterBridge {
  private static resolvedTarget: PythonTarget | null = null;
  private static resolvePromise: Promise<PythonTarget | null> | null = null;
  private static lastCustomPath: string | undefined = undefined;

  /** Serialisiert alle Konvertierungen: immer nur ein Python-Prozess gleichzeitig. */
  private static conversionChain: Promise<unknown> = Promise.resolve();
  /** Solange eine Installation läuft, warten Konvertierungen (halb installierte Pakete vermeiden). */
  private static installLock: Promise<unknown> | null = null;
  /**
   * Engines, die den Python-Prozess zum Absturz gebracht haben (z. B. defekte native
   * Bibliotheken auf dem Notebook). Sie werden für den Rest der Sitzung übersprungen.
   */
  private static brokenEngines = new Set<string>();

  // ---------------------------------------------------------------------------
  // Prozess-Helfer
  // ---------------------------------------------------------------------------

  /**
   * Saubere Umgebung für Kindprozesse: fremde PYTHONPATH/PYTHONHOME-Einträge sind auf
   * fremden Notebooks eine der häufigsten Fehlerquellen ("No module named ...").
   */
  private static childEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.PYTHONPATH;
    delete env.PYTHONHOME;
    delete env.PYTHONSTARTUP;
    // Pakete aus einer --user-Installation müssen sichtbar bleiben.
    delete env.PYTHONNOUSERSITE;
    env.PYTHONIOENCODING = 'utf-8';
    env.PYTHONUTF8 = '1';
    // Verhindert, dass pip bei jedem Aufruf im Netz nach Updates sucht.
    env.PIP_DISABLE_PIP_VERSION_CHECK = '1';
    return env;
  }

  /** Führt einen Befehl aus und sammelt stdout/stderr – niemals blockierend. */
  private static run(
    command: string,
    args: string[],
    options: {
      timeoutMs?: number;
      input?: string;
      onData?: (chunk: string) => void;
      extraEnv?: NodeJS.ProcessEnv;
    } = {}
  ): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean; error?: Error }> {
    const { timeoutMs = 30000, input, onData, extraEnv } = options;

    return new Promise((resolve) => {
      let child: ChildProcess;
      try {
        child = spawn(command, args, {
          windowsHide: true,
          env: { ...this.childEnv(), ...(extraEnv || {}) }
        });
      } catch (err) {
        resolve({ code: null, stdout: '', stderr: '', timedOut: false, error: err as Error });
        return;
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          /* Prozess ist bereits beendet */
        }
      }, timeoutMs);

      const finish = (payload: { code: number | null; error?: Error }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ code: payload.code, stdout, stderr, timedOut, error: payload.error });
      };

      child.stdout?.on('data', (d: Buffer) => {
        const text = d.toString('utf-8');
        stdout += text;
        onData?.(text);
      });
      child.stderr?.on('data', (d: Buffer) => {
        const text = d.toString('utf-8');
        stderr += text;
        onData?.(text);
      });

      child.on('error', (err) => finish({ code: null, error: err }));
      child.on('close', (code) => finish({ code }));

      if (input !== undefined) {
        // Ohne Fehler-Handler wirft ein EPIPE (Prozess sofort beendet) im Main-Prozess.
        child.stdin?.on('error', () => {
          /* Kindprozess nimmt keine Eingaben mehr entgegen */
        });
        try {
          child.stdin?.write(input, 'utf-8');
          child.stdin?.end();
        } catch {
          /* siehe oben */
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Python-Erkennung
  // ---------------------------------------------------------------------------

  /** Prüft ein Python-Ziel und liefert Version, echten Interpreterpfad und venv-Status. */
  private static async probe(command: string, baseArgs: string[]): Promise<ProbeResult> {
    const code =
      'import sys,json;' +
      'print("MIUPROBE"+json.dumps({"v":list(sys.version_info[:3]),' +
      '"exe":sys.executable,"venv":sys.prefix!=sys.base_prefix}))';

    const res = await this.run(command, [...baseArgs, '-c', code], { timeoutMs: 8000 });
    const marker = res.stdout.indexOf('MIUPROBE');
    if (marker === -1) return { ok: false };

    try {
      const parsed = JSON.parse(res.stdout.slice(marker + 'MIUPROBE'.length).trim());
      const v = parsed.v;
      if (!Array.isArray(v) || v.length < 2) return { ok: false };
      return {
        ok: true,
        version: [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0],
        executable: typeof parsed.exe === 'string' ? parsed.exe : undefined,
        inVenv: Boolean(parsed.venv)
      };
    } catch {
      return { ok: false };
    }
  }

  /** Sammelt alle plausiblen Python-Kandidaten des Systems (Windows, macOS, Linux). */
  private static collectCandidates(): PythonTarget[] {
    const candidates: PythonTarget[] = [];
    const seen = new Set<string>();

    const push = (command: string, baseArgs: string[] = []) => {
      const key = `${command}|${baseArgs.join(' ')}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ command, baseArgs, display: command });
    };

    const pushFile = (filePath: string) => {
      if (!filePath) return;
      // Microsoft-Store-Platzhalter öffnen nur den Store und blockieren die Erkennung.
      if (filePath.toLowerCase().includes(`microsoft${path.sep}windowsapps`)) return;
      try {
        if (fs.existsSync(filePath)) push(filePath);
      } catch {
        /* Zugriff verweigert */
      }
    };

    const exeName = process.platform === 'win32' ? 'python.exe' : 'python3';

    // Ein aktives virtuelles Environment hat immer Vorrang.
    if (process.env.VIRTUAL_ENV) {
      pushFile(
        path.join(
          process.env.VIRTUAL_ENV,
          process.platform === 'win32' ? 'Scripts' : 'bin',
          exeName
        )
      );
    }
    if (process.env.CONDA_PREFIX) {
      pushFile(
        process.platform === 'win32'
          ? path.join(process.env.CONDA_PREFIX, 'python.exe')
          : path.join(process.env.CONDA_PREFIX, 'bin', 'python3')
      );
    }

    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const userProfile = process.env.USERPROFILE || '';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

      const scanDirs = [
        path.join(localAppData, 'Programs', 'Python'),
        path.join(localAppData, 'Python'),
        programFiles,
        programFilesX86,
        'C:\\'
      ];

      for (const dir of scanDirs) {
        try {
          if (!fs.existsSync(dir)) continue;
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const lower = entry.name.toLowerCase();
            if (!lower.startsWith('python') && !lower.startsWith('pythoncore')) continue;
            pushFile(path.join(dir, entry.name, 'python.exe'));
          }
        } catch {
          /* Verzeichnis nicht lesbar */
        }
      }

      pushFile(path.join(localAppData, 'Python', 'bin', 'python.exe'));
      pushFile(path.join(userProfile, 'miniconda3', 'python.exe'));
      pushFile(path.join(userProfile, 'anaconda3', 'python.exe'));
      pushFile(path.join(userProfile, '.pyenv', 'pyenv-win', 'bin', 'python.exe'));
      pushFile(path.join(userProfile, 'scoop', 'apps', 'python', 'current', 'python.exe'));
      pushFile('C:\\tools\\python\\python.exe');

      // Windows Python Launcher – deckt auch Installationen ab, die nicht im PATH stehen.
      push('py', ['-3']);
      push('python');
      push('python3');
    } else {
      for (const p of [
        '/usr/local/bin/python3',
        '/usr/bin/python3',
        '/opt/homebrew/bin/python3',
        path.join(os.homedir(), '.pyenv', 'shims', 'python3')
      ]) {
        pushFile(p);
      }
      push('python3');
      push('python');
    }

    return candidates;
  }

  /**
   * Ermittelt das beste verfügbare Python (neueste Version >= 3.9) und merkt sich das Ergebnis.
   * Läuft vollständig asynchron – der Main-Prozess wird nie blockiert.
   */
  public static async resolvePython(customPath?: string, forceRefresh = false): Promise<PythonTarget | null> {
    const normalizedCustom = customPath?.trim() || undefined;
    if (normalizedCustom !== this.lastCustomPath) {
      // Nutzer hat einen anderen Interpreter konfiguriert → neu suchen.
      this.resolvedTarget = null;
      this.resolvePromise = null;
      this.lastCustomPath = normalizedCustom;
    }

    if (forceRefresh) {
      this.resolvedTarget = null;
      this.resolvePromise = null;
    }

    if (this.resolvedTarget) {
      // Schnellprüfung: existiert die Datei noch? (Deinstallation/Update von Python)
      if (
        this.resolvedTarget.command.includes(path.sep) &&
        !fs.existsSync(this.resolvedTarget.command)
      ) {
        this.resolvedTarget = null;
        this.resolvePromise = null;
      } else {
        return this.resolvedTarget;
      }
    }

    if (!this.resolvePromise) {
      this.resolvePromise = this.doResolvePython(normalizedCustom).finally(() => {
        this.resolvePromise = null;
      });
    }
    return this.resolvePromise;
  }

  private static async doResolvePython(customPath?: string): Promise<PythonTarget | null> {
    // 1. Vom Nutzer konfigurierter Pfad hat Vorrang.
    if (customPath) {
      const probe = await this.probe(customPath, []);
      if (probe.ok) {
        this.resolvedTarget = {
          command: customPath,
          baseArgs: [],
          display: probe.executable || customPath,
          version: probe.version,
          inVenv: probe.inVenv
        };
        return this.resolvedTarget;
      }
    }

    const candidates = this.collectCandidates();
    const probed: PythonTarget[] = [];

    // Kandidaten parallel prüfen (kurze Timeouts), damit die Suche auch mit
    // vielen Installationen unter einer Sekunde bleibt.
    const results = await Promise.all(
      candidates.map(async (cand) => {
        const probe = await this.probe(cand.command, cand.baseArgs);
        if (!probe.ok || !probe.version) return null;
        return {
          ...cand,
          display: probe.executable || cand.command,
          version: probe.version,
          inVenv: probe.inVenv
        } as PythonTarget;
      })
    );

    for (const r of results) {
      if (r) probed.push(r);
    }

    if (probed.length === 0) {
      this.resolvedTarget = null;
      return null;
    }

    const versionValue = (t: PythonTarget) =>
      (t.version?.[0] ?? 0) * 10000 + (t.version?.[1] ?? 0) * 100 + (t.version?.[2] ?? 0);

    // MarkItDown benötigt >= 3.10; darunter greifen nur die Fallback-Engines (ab 3.9).
    const preferred = probed.filter((t) => versionValue(t) >= 3 * 10000 + 10 * 100);
    const usable = preferred.length > 0 ? preferred : probed;
    usable.sort((a, b) => versionValue(b) - versionValue(a));

    this.resolvedTarget = usable[0];
    return this.resolvedTarget;
  }

  public static describeTarget(target: PythonTarget | null): string {
    if (!target) return '';
    return target.display || [target.command, ...target.baseArgs].join(' ');
  }

  // ---------------------------------------------------------------------------
  // Pfade zu mitgelieferten Ressourcen
  // ---------------------------------------------------------------------------

  private static resourceCandidates(relative: string[]): string[] {
    const list: string[] = [];
    if (app.isPackaged) {
      list.push(path.join(process.resourcesPath, ...relative));
      list.push(path.join(process.resourcesPath, 'app.asar.unpacked', ...relative));
      list.push(path.join(__dirname, '..', ...relative));
    }
    list.push(path.join(app.getAppPath(), ...relative));
    return list;
  }

  private static firstExisting(candidates: string[], fallback: string): string {
    for (const c of candidates) {
      try {
        if (fs.existsSync(c)) return c;
      } catch {
        /* ignorieren */
      }
    }
    return fallback;
  }

  public static getWorkerScriptPath(): string {
    const candidates = this.resourceCandidates(['python_engine', 'markitdown_worker.py']);
    return this.firstExisting(candidates, candidates[candidates.length - 1]);
  }

  public static getRequirementsPath(): string {
    const candidates = [
      ...this.resourceCandidates(['requirements.txt']),
      ...this.resourceCandidates(['python_engine', 'requirements.txt'])
    ];
    return this.firstExisting(candidates, candidates[candidates.length - 1]);
  }

  public static getSetupScriptPath(): string {
    const candidates = [
      ...this.resourceCandidates(['install_requirements.bat']),
      ...this.resourceCandidates(['python_engine', 'install_requirements.bat'])
    ];
    return this.firstExisting(candidates, candidates[candidates.length - 1]);
  }

  // ---------------------------------------------------------------------------
  // Diagnose
  // ---------------------------------------------------------------------------

  private static emptyStatus(overrides: Partial<PythonEnvironmentStatus>): PythonEnvironmentStatus {
    return {
      isReady: false,
      pythonFound: false,
      pythonVersion: '',
      pythonPath: '',
      installedPackages: [],
      missingPackages: [
        'markitdown',
        'pdfplumber',
        'mammoth',
        'python-docx',
        'python-pptx',
        'openpyxl'
      ],
      hasMarkitdown: false,
      hasPdfplumber: false,
      hasMammoth: false,
      hasPptx: false,
      hasOpenpyxl: false,
      hasDocx: false,
      ...overrides
    };
  }

  public static async checkEnvironment(customPythonPath?: string, forceRefresh = false): Promise<PythonEnvironmentStatus> {
    const target = await this.resolvePython(customPythonPath, forceRefresh);

    if (!target) {
      return this.emptyStatus({
        error:
          'Kein funktionierendes Python gefunden. MarkItUI kann Python automatisch installieren ' +
          '("Python automatisch installieren") oder du installierst es von python.org.'
      });
    }

    const workerScript = this.getWorkerScriptPath();
    if (!fs.existsSync(workerScript)) {
      return this.emptyStatus({
        pythonFound: true,
        pythonPath: this.describeTarget(target),
        pythonVersion: target.version?.join('.') || '',
        error: `Konverter-Skript nicht gefunden: ${workerScript}`
      });
    }

    const res = await this.run(target.command, [...target.baseArgs, workerScript, '--doctor'], {
      timeoutMs: 60000
    });

    const parsed = this.extractJson(res.stdout);
    if (!parsed) {
      return this.emptyStatus({
        pythonFound: true,
        pythonPath: this.describeTarget(target),
        pythonVersion: target.version?.join('.') || '',
        error: res.timedOut
          ? 'Zeitüberschreitung bei der Diagnose. Läuft ein Virenscanner oder ein sehr langsamer Datenträger?'
          : `Ungültige Diagnose-Antwort: ${res.stderr || res.stdout || res.error?.message || 'keine Ausgabe'}`
      });
    }

    const tooOld = (target.version?.[0] ?? 0) === 3 && (target.version?.[1] ?? 0) < 9;

    return {
      isReady: Boolean(parsed.ready) && !tooOld,
      pythonFound: true,
      pythonVersion: parsed.python_version || target.version?.join('.') || '',
      pythonPath: parsed.python_executable || this.describeTarget(target),
      installedPackages: parsed.installed_packages || [],
      missingPackages: parsed.missing_packages || [],
      hasMarkitdown: Boolean(parsed.has_markitdown),
      hasPdfplumber: Boolean(parsed.has_pdfplumber),
      hasMammoth: Boolean(parsed.has_mammoth),
      hasPptx: Boolean(parsed.has_pptx),
      hasOpenpyxl: Boolean(parsed.has_openpyxl),
      hasDocx: Boolean(parsed.has_docx),
      pythonTooOld: tooOld,
      error: tooOld
        ? `Python ${target.version?.join('.')} ist zu alt. Bitte Python 3.10 oder neuer installieren.`
        : undefined
    };
  }

  // ---------------------------------------------------------------------------
  // Python-Bootstrap (Notebook ohne jede Installation)
  // ---------------------------------------------------------------------------

  /** Lädt eine Datei über HTTPS und folgt Weiterleitungen. */
  private static download(url: string, targetFile: string, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = (currentUrl: string, redirects: number) => {
        if (redirects > 5) {
          reject(new Error('Zu viele Weiterleitungen beim Download.'));
          return;
        }

        https
          .get(currentUrl, { timeout: 60000 }, (response) => {
            const status = response.statusCode || 0;
            if (status >= 300 && status < 400 && response.headers.location) {
              response.resume();
              request(new URL(response.headers.location, currentUrl).toString(), redirects + 1);
              return;
            }
            if (status !== 200) {
              response.resume();
              reject(new Error(`Download fehlgeschlagen (HTTP ${status}).`));
              return;
            }

            const total = Number(response.headers['content-length'] || 0);
            let received = 0;
            const file = fs.createWriteStream(targetFile);

            response.on('data', (chunk: Buffer) => {
              received += chunk.length;
              if (total > 0 && onProgress) {
                onProgress(Math.round((received / total) * 100));
              }
            });
            response.pipe(file);

            file.on('finish', () => file.close(() => resolve()));
            file.on('error', (err) => reject(err));
            response.on('error', (err) => reject(err));
          })
          .on('timeout', function (this: any) {
            this.destroy(new Error('Zeitüberschreitung beim Download.'));
          })
          .on('error', (err) => reject(err));
      };

      request(url, 0);
    });
  }

  /**
   * Stellt sicher, dass überhaupt ein Python vorhanden ist – installiert es bei Bedarf
   * (zuerst über winget im Benutzerkontext, sonst über den offiziellen python.org-Installer).
   */
  public static async ensurePython(
    customPythonPath?: string,
    onProgress?: ProgressReporter
  ): Promise<EnsurePythonResult> {
    let log = '';
    const report = (stage: InstallProgressEvent['stage'], message: string, percent?: number) => {
      log += `${message}\n`;
      onProgress?.({ stage, message, percent });
    };

    const existing = await this.resolvePython(customPythonPath);
    if (existing) {
      const version = existing.version?.join('.') || '';
      if ((existing.version?.[0] ?? 0) > 3 || (existing.version?.[1] ?? 0) >= 9) {
        report('python', `Python ${version} gefunden: ${this.describeTarget(existing)}`);
        return { success: true, pythonPath: this.describeTarget(existing), log };
      }
      report('python', `Gefundenes Python ${version} ist zu alt – installiere eine aktuelle Version.`);
    } else {
      report('python', 'Kein Python gefunden – starte automatische Installation.');
    }

    if (process.platform !== 'win32') {
      return {
        success: false,
        pythonPath: '',
        log,
        error:
          'Automatische Python-Installation wird nur unter Windows unterstützt. ' +
          'Bitte Python 3.10+ über den Paketmanager des Systems installieren.'
      };
    }

    // 1. Versuch: winget (auf Windows 10 21H2+ und Windows 11 vorinstalliert)
    const wingetCheck = await this.run('winget', ['--version'], { timeoutMs: 15000 });
    if (wingetCheck.code === 0) {
      report('python', 'Installiere Python 3.12 über winget (Benutzerkonto, keine Adminrechte nötig)...', 20);
      const install = await this.run(
        'winget',
        [
          'install',
          '--id',
          WINGET_PACKAGE,
          '-e',
          '--scope',
          'user',
          '--accept-source-agreements',
          '--accept-package-agreements',
          '--disable-interactivity'
        ],
        { timeoutMs: 15 * 60 * 1000, onData: (chunk) => { log += chunk; } }
      );
      log += `\n[winget exit ${install.code}]\n`;

      const afterWinget = await this.resolvePython(customPythonPath, true);
      if (afterWinget) {
        report('python', `Python erfolgreich installiert: ${this.describeTarget(afterWinget)}`, 60);
        return { success: true, pythonPath: this.describeTarget(afterWinget), log, installed: true };
      }
      report('python', 'winget hat kein nutzbares Python hinterlassen – versuche Direkt-Download.', 30);
    } else {
      report('python', 'winget ist nicht verfügbar – lade Python direkt von python.org.', 20);
    }

    // 2. Versuch: offizieller Installer von python.org (Benutzer-Installation, ohne Adminrechte)
    const url = process.arch === 'ia32' ? PYTHON_INSTALLER_URL_X86 : PYTHON_INSTALLER_URL;
    const targetFile = path.join(os.tmpdir(), `markitui-python-setup-${Date.now()}.exe`);

    try {
      report('python', 'Lade Python-Installer von python.org...', 35);
      await this.download(url, targetFile, (percent) => {
        onProgress?.({
          stage: 'python',
          message: `Lade Python-Installer... ${percent}%`,
          percent: 35 + Math.round(percent * 0.2)
        });
      });

      const stat = fs.statSync(targetFile);
      if (stat.size < 1024 * 1024) {
        throw new Error('Der heruntergeladene Installer ist unvollständig.');
      }

      report('python', 'Installiere Python (das kann einige Minuten dauern)...', 58);
      const setup = await this.run(
        targetFile,
        ['/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_pip=1', 'Include_test=0'],
        { timeoutMs: 20 * 60 * 1000 }
      );
      log += `\n[python-installer exit ${setup.code}]\n`;
    } catch (err: any) {
      return {
        success: false,
        pythonPath: '',
        log,
        error:
          `Automatische Python-Installation fehlgeschlagen: ${err.message}. ` +
          'Bitte Python 3.12 manuell von https://www.python.org/downloads/ installieren.'
      };
    } finally {
      try {
        if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
      } catch {
        /* Temporärdatei bleibt liegen */
      }
    }

    const afterInstall = await this.resolvePython(customPythonPath, true);
    if (afterInstall) {
      report('python', `Python installiert: ${this.describeTarget(afterInstall)}`, 65);
      return { success: true, pythonPath: this.describeTarget(afterInstall), log, installed: true };
    }

    return {
      success: false,
      pythonPath: '',
      log,
      error:
        'Python wurde installiert, konnte aber nicht gefunden werden. ' +
        'Bitte MarkItUI einmal neu starten.'
    };
  }

  // ---------------------------------------------------------------------------
  // Paket-Installation
  // ---------------------------------------------------------------------------

  private static async pipInstall(
    target: PythonTarget,
    args: string[],
    onLog: (chunk: string) => void
  ): Promise<{ ok: boolean; log: string }> {
    const baseArgs = [...target.baseArgs, '-m', 'pip', 'install', '--disable-pip-version-check', ...args];

    let result = await this.run(target.command, baseArgs, {
      timeoutMs: 25 * 60 * 1000,
      onData: onLog
    });

    if (result.code === 0) return { ok: true, log: result.stdout + result.stderr };

    const output = `${result.stdout}\n${result.stderr}`;
    const permissionProblem =
      /permission denied|access is denied|could not install packages due to an OSError|WinError 5|Zugriff verweigert/i.test(
        output
      );

    // Ohne Adminrechte scheitert die Installation in "Program Files" – dann in den Benutzerbereich.
    if (permissionProblem && !target.inVenv && !args.includes('--user')) {
      onLog('\n[MarkItUI] Wiederhole Installation im Benutzerkontext (--user)...\n');
      result = await this.run(
        target.command,
        [...target.baseArgs, '-m', 'pip', 'install', '--disable-pip-version-check', '--user', ...args],
        { timeoutMs: 25 * 60 * 1000, onData: onLog }
      );
      if (result.code === 0) return { ok: true, log: result.stdout + result.stderr };
    }

    return { ok: false, log: `${result.stdout}\n${result.stderr}` };
  }

  /**
   * Installiert alle benötigten Pakete. Gruppenweise, damit ein einzelnes fehlschlagendes
   * Paket nicht die komplette Einrichtung verhindert.
   */
  public static async installRequirements(
    customPythonPath?: string,
    onProgress?: ProgressReporter
  ): Promise<InstallRequirementsResult> {
    let log = '';
    const append = (chunk: string) => {
      log += chunk;
    };
    const report = (stage: InstallProgressEvent['stage'], message: string, percent?: number) => {
      log += `\n[MarkItUI] ${message}\n`;
      onProgress?.({ stage, message, percent });
    };

    let release: () => void = () => undefined;
    this.installLock = new Promise<void>((resolve) => {
      release = resolve;
    });

    try {
      // 1. Python sicherstellen (installiert es notfalls automatisch).
      const ensure = await this.ensurePython(customPythonPath, onProgress);
      log += ensure.log;
      if (!ensure.success) {
        return { success: false, log, error: ensure.error };
      }

      const target = await this.resolvePython(customPythonPath);
      if (!target) {
        return { success: false, log, error: 'Python konnte nach der Installation nicht gefunden werden.' };
      }

      // 2. pip sicherstellen (manche Installationen kommen ohne pip).
      report('pip', 'Prüfe pip...', 68);
      const pipCheck = await this.run(target.command, [...target.baseArgs, '-m', 'pip', '--version'], {
        timeoutMs: 60000
      });
      append(pipCheck.stdout + pipCheck.stderr);
      if (pipCheck.code !== 0) {
        report('pip', 'pip fehlt – richte pip ein (ensurepip)...', 70);
        const ensurePip = await this.run(target.command, [...target.baseArgs, '-m', 'ensurepip', '--upgrade'], {
          timeoutMs: 5 * 60 * 1000,
          onData: append
        });
        if (ensurePip.code !== 0) {
          return {
            success: false,
            log,
            error: 'pip konnte nicht eingerichtet werden. Bitte Python neu installieren (mit der Option "pip").'
          };
        }
      }

      // pip-Update ist optional – ein Fehler hier darf nichts blockieren.
      report('pip', 'Aktualisiere pip...', 72);
      const pipUpgrade = await this.run(
        target.command,
        [...target.baseArgs, '-m', 'pip', 'install', '--disable-pip-version-check', '--upgrade', 'pip'],
        { timeoutMs: 10 * 60 * 1000, onData: append }
      );
      if (pipUpgrade.code !== 0) {
        append('\n[MarkItUI] pip-Update übersprungen (nicht kritisch).\n');
      }

      // 3. Pakete gruppenweise installieren.
      const failedRequired: string[] = [];
      const failedOptional: string[] = [];
      const groupCount = PACKAGE_GROUPS.length;

      for (let i = 0; i < groupCount; i++) {
        const group = PACKAGE_GROUPS[i];
        const percent = 75 + Math.round((i / groupCount) * 20);
        report('packages', `Installiere ${group.name}...`, percent);

        const res = await this.pipInstall(target, ['--upgrade', ...group.packages], append);
        if (res.ok) continue;

        // Zweiter Versuch: Pakete einzeln, damit ein defektes Paket die anderen nicht mitreißt.
        append(`\n[MarkItUI] Gruppe "${group.name}" fehlgeschlagen – versuche Pakete einzeln.\n`);
        let anyFailed = false;
        for (const pkg of group.packages) {
          const single = await this.pipInstall(target, [pkg], append);
          if (!single.ok) {
            anyFailed = true;
            if (group.required) failedRequired.push(pkg);
            else failedOptional.push(pkg);
          }
        }

        // MarkItDown ohne Extras ist besser als gar kein MarkItDown.
        if (anyFailed && !group.required) {
          append('\n[MarkItUI] Versuche MarkItDown ohne Zusatz-Extras...\n');
          const fallback = await this.pipInstall(target, MARKITDOWN_FALLBACK, append);
          if (fallback.ok) failedOptional.length = 0;
        }
      }

      // 4. Ergebnis verifizieren.
      report('verify', 'Prüfe Installation...', 96);
      const status = await this.checkEnvironment(customPythonPath, true);

      if (status.isReady) {
        report('done', 'Alle Voraussetzungen sind installiert.', 100);
        return { success: true, log, status };
      }

      const missing = status.missingPackages.join(', ') || failedRequired.join(', ');
      report('error', `Einige Pakete fehlen weiterhin: ${missing}`, 100);
      return {
        success: false,
        log,
        status,
        error:
          `Diese Pakete konnten nicht installiert werden: ${missing}. ` +
          'Bitte prüfe die Internetverbindung oder führe install_requirements.bat aus.'
      };
    } catch (err: any) {
      return { success: false, log, error: `Installation fehlgeschlagen: ${err.message}` };
    } finally {
      release();
      this.installLock = null;
    }
  }

  /** Öffnet das Setup-Skript in einem sichtbaren Terminal-Fenster. */
  public static async openSetupScript(): Promise<boolean> {
    const scriptPath = this.getSetupScriptPath();
    if (!fs.existsSync(scriptPath)) {
      return false;
    }

    if (process.platform !== 'win32') {
      return false;
    }

    try {
      // cmd.exe /c start ... hält das Fenster über /k offen; kein shell:true nötig.
      const child = spawn(
        process.env.ComSpec || 'cmd.exe',
        ['/c', 'start', 'MarkItUI Setup', 'cmd.exe', '/k', scriptPath],
        { windowsHide: false, detached: true, stdio: 'ignore', env: this.childEnv() }
      );
      child.unref();
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Konvertierung
  // ---------------------------------------------------------------------------

  /**
   * Liest aus stderr, welche Engine zuletzt gestartet wurde. Fehlt danach die JSON-Antwort,
   * hat genau diese Engine den Interpreter abstürzen lassen.
   */
  private static detectCrashedEngine(stderr: string): string | null {
    if (!stderr) return null;
    const lastMarker = stderr.lastIndexOf(ENGINE_MARKER);
    if (lastMarker === -1) return null;
    const rest = stderr.slice(lastMarker + ENGINE_MARKER.length);
    const name = rest.split(/[\r\n]/)[0]?.trim();
    return name || null;
  }

  /** Holt das JSON des Workers aus stdout – auch wenn Bibliotheken dorthin schreiben. */
  private static extractJson(stdout: string): any | null {
    if (!stdout) return null;

    const begin = stdout.lastIndexOf(JSON_BEGIN);
    const end = stdout.lastIndexOf(JSON_END);
    if (begin !== -1 && end > begin) {
      try {
        return JSON.parse(stdout.slice(begin + JSON_BEGIN.length, end).trim());
      } catch {
        /* fällt unten auf die Heuristik zurück */
      }
    }

    const trimmed = stdout.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      /* letzte Heuristik: das letzte JSON-Objekt in der Ausgabe */
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Konvertiert ein Dokument. Alle Aufrufe werden serialisiert – es läuft immer nur
   * ein Python-Prozess, damit das Notebook auch bei 100 Dateien flüssig bleibt.
   */
  public static async convert(req: ConversionRequest, customPythonPath?: string): Promise<ConversionResult> {
    const task = this.conversionChain
      .catch(() => undefined)
      .then(() => this.convertNow(req, customPythonPath));
    this.conversionChain = task.catch(() => undefined);
    return task;
  }

  private static async convertNow(req: ConversionRequest, customPythonPath?: string): Promise<ConversionResult> {
    const fileName = path.basename(req.filePath || '');

    if (this.installLock) {
      await this.installLock.catch(() => undefined);
    }

    if (!req.filePath || !fs.existsSync(req.filePath)) {
      return {
        success: false,
        markdown: '',
        error: `Die Datei existiert nicht (mehr): ${req.filePath}`,
        fileName
      };
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(req.filePath);
    } catch (err: any) {
      return {
        success: false,
        markdown: '',
        error: `Datei nicht lesbar: ${err.message}`,
        fileName
      };
    }

    if (stat.isDirectory()) {
      return { success: false, markdown: '', error: 'Ordner können nicht direkt umgewandelt werden.', fileName };
    }
    if (stat.size === 0) {
      return { success: false, markdown: '', error: 'Die Datei ist leer (0 Bytes).', fileName };
    }

    const target = await this.resolvePython(customPythonPath);
    if (!target) {
      return {
        success: false,
        markdown: '',
        error:
          'Python wurde nicht gefunden. Öffne die Einstellungen und klicke auf ' +
          '"1-Klick Pakete reparieren / installieren" – MarkItUI installiert Python bei Bedarf automatisch.',
        fileName,
        missingPrerequisites: true
      };
    }

    const workerScript = this.getWorkerScriptPath();
    if (!fs.existsSync(workerScript)) {
      return {
        success: false,
        markdown: '',
        error: `Konverter-Skript nicht gefunden: ${workerScript}`,
        fileName
      };
    }

    const inputPayload = JSON.stringify({
      file_path: req.filePath,
      add_frontmatter: req.addFrontmatter ?? true,
      tags: req.tags || ['schule', 'itslearning'],
      subject: req.subject || '',
      title: req.title || ''
    });

    // Große Dateien brauchen länger – Timeout wächst mit der Dateigröße.
    const megabytes = stat.size / (1024 * 1024);
    const timeoutMs = Math.min(15 * 60 * 1000, Math.max(120000, Math.round(megabytes * 20000)));

    let res = await this.run(target.command, [...target.baseArgs, workerScript, '--json-input'], {
      timeoutMs,
      input: inputPayload,
      extraEnv: this.brokenEngines.size > 0
        ? { MARKITUI_SKIP_ENGINES: [...this.brokenEngines].join(',') }
        : undefined
    });

    // Eine defekte native Bibliothek (z. B. ein kaputtes cryptography/cffi auf dem Notebook)
    // kann den Python-Prozess hart beenden, bevor er antworten kann. Dann merken wir uns die
    // Engine und versuchen es sofort mit der nächsten aus der Kette.
    let crashRetries = 0;
    while (
      crashRetries < 3 &&
      !res.timedOut &&
      !this.extractJson(res.stdout) &&
      this.detectCrashedEngine(res.stderr)
    ) {
      const crashed = this.detectCrashedEngine(res.stderr)!;
      if (this.brokenEngines.has(crashed)) break;

      this.brokenEngines.add(crashed);
      crashRetries++;
      console.warn(`[MarkItUI] Engine "${crashed}" hat Python beendet – wird übersprungen.`);

      res = await this.run(target.command, [...target.baseArgs, workerScript, '--json-input'], {
        timeoutMs,
        input: inputPayload,
        extraEnv: { MARKITUI_SKIP_ENGINES: [...this.brokenEngines].join(',') }
      });
    }

    if (res.error) {
      // Der Interpreter ist verschwunden (Update/Deinstallation) → nächste Suche neu starten.
      this.resolvedTarget = null;
      return {
        success: false,
        markdown: '',
        error: `Python konnte nicht gestartet werden (${this.describeTarget(target)}): ${res.error.message}`,
        fileName,
        missingPrerequisites: true
      };
    }

    if (res.timedOut) {
      return {
        success: false,
        markdown: '',
        error: `Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} s bei "${fileName}". Die Datei ist zu groß oder beschädigt.`,
        fileName
      };
    }

    const parsed = this.extractJson(res.stdout);

    if (!parsed) {
      const stderr = res.stderr || '';
      const isModuleError = /No module named|ImportError|ModuleNotFoundError/i.test(stderr);
      return {
        success: false,
        markdown: '',
        error: isModuleError
          ? `Es fehlen Python-Pakete:\n${stderr.trim()}\n\nKlicke auf "1-Klick Pakete reparieren / installieren".`
          : `MarkItUI Konvertierungsfehler (Exit Code ${res.code}):\n${stderr.trim() || res.stdout.trim() || 'Unbekannter Fehler'}`,
        fileName,
        missingPrerequisites: isModuleError
      };
    }

    return {
      success: Boolean(parsed.success),
      markdown: parsed.markdown || '',
      error: parsed.error || null,
      fileName: parsed.file_name || fileName,
      charCount: parsed.char_count,
      engineUsed: parsed.engine_used,
      missingPrerequisites: Boolean(parsed.missing_prerequisites)
    };
  }
}
