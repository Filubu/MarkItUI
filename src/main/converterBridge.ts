import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { ConversionRequest, ConversionResult } from '../shared/types';

export class ConverterBridge {
  private static findPythonExecutable(customPath?: string): string {
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    // Windows standard locations & Python launcher
    const localAppData = process.env.LOCALAPPDATA || '';
    const candidates = [
      path.join(localAppData, 'Python', 'bin', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
      'python.exe',
      'python',
      'py.exe'
    ];

    for (const cand of candidates) {
      if (cand.includes(path.sep) && fs.existsSync(cand)) {
        return cand;
      }
    }

    return 'python';
  }

  private static getWorkerScriptPath(): string {
    if (app.isPackaged) {
      // In packaged electron app, check resources
      const resourcePath = path.join(process.resourcesPath, 'python_engine', 'markitdown_worker.py');
      if (fs.existsSync(resourcePath)) {
        return resourcePath;
      }
      return path.join(__dirname, '..', 'python_engine', 'markitdown_worker.py');
    }
    return path.join(app.getAppPath(), 'python_engine', 'markitdown_worker.py');
  }

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

    return new Promise((resolve) => {
      const inputPayload = JSON.stringify({
        file_path: req.filePath,
        add_frontmatter: req.addFrontmatter ?? true,
        tags: req.tags || ['schule', 'itslearning'],
        subject: req.subject || '',
        title: req.title || ''
      });

      const child = spawn(pythonExe, [workerScript, '--json-input'], {
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
          error: `Fehler beim Ausführen von Python (${pythonExe}): ${err.message}. Bitte überprüfe die Python-Installation.`,
          fileName: path.basename(req.filePath)
        });
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdoutData) {
          resolve({
            success: false,
            markdown: '',
            error: `MarkItUI Konvertierungsfehler (Exit Code ${code}):\n${stderrData || 'Unbekannter Fehler'}`,
            fileName: path.basename(req.filePath)
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
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
      child.stdin.write(inputPayload);
      child.stdin.end();
    });
  }
}
