var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
var ConverterBridge = /** @class */ (function () {
    function ConverterBridge() {
    }
    ConverterBridge.findPythonExecutable = function (customPath) {
        if (customPath && fs.existsSync(customPath)) {
            return customPath;
        }
        // Windows standard locations & Python launcher
        var localAppData = process.env.LOCALAPPDATA || '';
        var candidates = [
            path.join(localAppData, 'Python', 'bin', 'python.exe'),
            path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
            path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
            path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
            'python.exe',
            'python',
            'py.exe'
        ];
        for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
            var cand = candidates_1[_i];
            if (cand.includes(path.sep) && fs.existsSync(cand)) {
                return cand;
            }
        }
        return 'python';
    };
    ConverterBridge.getWorkerScriptPath = function () {
        if (app.isPackaged) {
            // In packaged electron app, check resources
            var resourcePath = path.join(process.resourcesPath, 'python_engine', 'markitdown_worker.py');
            if (fs.existsSync(resourcePath)) {
                return resourcePath;
            }
            return path.join(__dirname, '..', 'python_engine', 'markitdown_worker.py');
        }
        return path.join(app.getAppPath(), 'python_engine', 'markitdown_worker.py');
    };
    ConverterBridge.convert = function (req, customPythonPath) {
        return __awaiter(this, void 0, void 0, function () {
            var pythonExe, workerScript;
            return __generator(this, function (_a) {
                pythonExe = this.findPythonExecutable(customPythonPath);
                workerScript = this.getWorkerScriptPath();
                if (!fs.existsSync(req.filePath)) {
                    return [2 /*return*/, {
                            success: false,
                            markdown: '',
                            error: "Die Datei existiert nicht: ".concat(req.filePath),
                            fileName: path.basename(req.filePath)
                        }];
                }
                return [2 /*return*/, new Promise(function (resolve) {
                        var _a;
                        var inputPayload = JSON.stringify({
                            file_path: req.filePath,
                            add_frontmatter: (_a = req.addFrontmatter) !== null && _a !== void 0 ? _a : true,
                            tags: req.tags || ['schule', 'itslearning'],
                            subject: req.subject || '',
                            title: req.title || ''
                        });
                        var child = spawn(pythonExe, [workerScript, '--json-input'], {
                            windowsHide: true,
                            env: __assign(__assign({}, process.env), { PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' })
                        });
                        var stdoutData = '';
                        var stderrData = '';
                        child.stdout.on('data', function (data) {
                            stdoutData += data.toString('utf-8');
                        });
                        child.stderr.on('data', function (data) {
                            stderrData += data.toString('utf-8');
                        });
                        child.on('error', function (err) {
                            resolve({
                                success: false,
                                markdown: '',
                                error: "Fehler beim Ausf\u00FChren von Python (".concat(pythonExe, "): ").concat(err.message, ". Bitte \u00FCberpr\u00FCfe die Python-Installation."),
                                fileName: path.basename(req.filePath)
                            });
                        });
                        child.on('close', function (code) {
                            if (code !== 0 && !stdoutData) {
                                resolve({
                                    success: false,
                                    markdown: '',
                                    error: "MarkItDown Konvertierungsfehler (Exit Code ".concat(code, "):\n").concat(stderrData || 'Unbekannter Fehler'),
                                    fileName: path.basename(req.filePath)
                                });
                                return;
                            }
                            try {
                                var parsed = JSON.parse(stdoutData.trim());
                                resolve(parsed);
                            }
                            catch (parseErr) {
                                resolve({
                                    success: false,
                                    markdown: '',
                                    error: "Ung\u00FCltige Ausgabe vom Konvertierer: ".concat(stdoutData || stderrData || parseErr.message),
                                    fileName: path.basename(req.filePath)
                                });
                            }
                        });
                        // Write payload to stdin and end
                        child.stdin.write(inputPayload);
                        child.stdin.end();
                    })];
            });
        });
    };
    return ConverterBridge;
}());
export { ConverterBridge };
