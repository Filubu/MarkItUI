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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { ipcMain, dialog, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { ConverterBridge } from './converterBridge';
var DEFAULT_SETTINGS = {
    vaultPath: '',
    defaultSubfolder: '',
    addFrontmatter: true,
    defaultTags: ['schule', 'itslearning'],
    autoOpenObsidian: false,
    autoConvertOnDrop: true
};
function getConfigPath() {
    var portableConfig = path.join(path.dirname(app.getPath('exe')), 'config.json');
    if (fs.existsSync(portableConfig)) {
        return portableConfig;
    }
    var userDataDir = path.join(app.getPath('userData'));
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }
    return path.join(userDataDir, 'config.json');
}
function loadSettings() {
    try {
        var configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            var data = fs.readFileSync(configPath, 'utf-8');
            return __assign(__assign({}, DEFAULT_SETTINGS), JSON.parse(data));
        }
    }
    catch (err) {
        console.error('[Settings] Fehler beim Laden:', err);
    }
    return __assign({}, DEFAULT_SETTINGS);
}
function saveSettingsToDisk(settings) {
    try {
        var configPath = getConfigPath();
        fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
    }
    catch (err) {
        console.error('[Settings] Fehler beim Speichern:', err);
        return false;
    }
}
function sanitizeFileName(name) {
    var clean = name.replace(/[\\/:*?"<>|#\^\[\]]/g, '_').trim();
    clean = clean.replace(/^\.+/, '');
    if (!clean)
        clean = 'Unbenannte_Notiz';
    if (!clean.toLowerCase().endsWith('.md')) {
        clean += '.md';
    }
    return clean;
}
export function registerIpcHandlers(mainWindow) {
    var _this = this;
    // Conversion Handler
    ipcMain.handle('convert-document', function (_event, req) { return __awaiter(_this, void 0, void 0, function () {
        var settings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    settings = loadSettings();
                    return [4 /*yield*/, ConverterBridge.convert(req, settings.customPythonPath)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Dialog: Select Files
    ipcMain.handle('select-files', function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dialog.showOpenDialog(mainWindow, {
                        title: 'Schulunterlagen auswählen',
                        properties: ['openFile', 'multiSelections'],
                        filters: [
                            {
                                name: 'Unterstützte Dokumente',
                                extensions: ['docx', 'doc', 'pdf', 'pptx', 'ppt', 'xlsx', 'xls', 'csv', 'html', 'xml', 'txt', 'jpg', 'png']
                            },
                            { name: 'Word Dokumente (*.docx)', extensions: ['docx', 'doc'] },
                            { name: 'PDF Dokumente (*.pdf)', extensions: ['pdf'] },
                            { name: 'PowerPoint Präsentationen (*.pptx)', extensions: ['pptx', 'ppt'] },
                            { name: 'Excel Tabellen (*.xlsx, *.csv)', extensions: ['xlsx', 'xls', 'csv'] },
                            { name: 'Alle Dateien (*.*)', extensions: ['*'] }
                        ]
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.canceled ? [] : result.filePaths];
            }
        });
    }); });
    // Dialog: Select Directory (e.g. Vault)
    ipcMain.handle('select-directory', function (_event, title) { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dialog.showOpenDialog(mainWindow, {
                        title: title || 'Obsidian Vault Ordner auswählen',
                        properties: ['openDirectory', 'createDirectory']
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]];
            }
        });
    }); });
    // Dialog: Save File
    ipcMain.handle('save-file-dialog', function (_event, defaultFileName, defaultPath) { return __awaiter(_this, void 0, void 0, function () {
        var cleanName, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cleanName = sanitizeFileName(defaultFileName);
                    return [4 /*yield*/, dialog.showSaveDialog(mainWindow, {
                            title: 'Markdown-Datei speichern',
                            defaultPath: defaultPath ? path.join(defaultPath, cleanName) : cleanName,
                            filters: [{ name: 'Markdown Datei (*.md)', extensions: ['md'] }]
                        })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.canceled ? null : result.filePath];
            }
        });
    }); });
    // Vault Subfolders Scanner
    ipcMain.handle('get-vault-subfolders', function (_event, vaultPath) { return __awaiter(_this, void 0, void 0, function () {
        function scan(dir, rel, depth) {
            if (depth > 4)
                return;
            try {
                var entries = fs.readdirSync(dir, { withFileTypes: true });
                for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                    var entry = entries_1[_i];
                    if (entry.isDirectory() && !ignored.has(entry.name) && !entry.name.startsWith('.')) {
                        var entryRel = rel ? "".concat(rel, "/").concat(entry.name) : entry.name;
                        folders.push(entryRel);
                        scan(path.join(dir, entry.name), entryRel, depth + 1);
                    }
                }
            }
            catch (err) {
                console.error('[Vault Scanner] Error:', err);
            }
        }
        var ignored, folders, sub;
        return __generator(this, function (_a) {
            if (!vaultPath || !fs.existsSync(vaultPath)) {
                return [2 /*return*/, ['/ (Hauptverzeichnis)']];
            }
            ignored = new Set(['.obsidian', '.trash', '.git', '.idea', '.vscode', 'node_modules', '$RECYCLE.BIN']);
            folders = ['/ (Hauptverzeichnis)'];
            try {
                scan(vaultPath, '', 1);
                sub = folders.slice(1).sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });
                return [2 /*return*/, __spreadArray(['/ (Hauptverzeichnis)'], sub, true)];
            }
            catch (e) {
                return [2 /*return*/, ['/ (Hauptverzeichnis)']];
            }
            return [2 /*return*/];
        });
    }); });
    // Save Note in Vault
    ipcMain.handle('save-note', function (_event, req) { return __awaiter(_this, void 0, void 0, function () {
        var targetDir, cleanSub, fileName, fullPath;
        return __generator(this, function (_a) {
            try {
                if (!req.vaultPath || !fs.existsSync(req.vaultPath)) {
                    return [2 /*return*/, { success: false, error: 'Vault-Pfad existiert nicht oder ist nicht konfiguriert.' }];
                }
                targetDir = req.vaultPath;
                if (req.subfolder && req.subfolder !== '/' && req.subfolder !== '/ (Hauptverzeichnis)') {
                    cleanSub = req.subfolder.replace(/^\/+/, '');
                    targetDir = path.join(req.vaultPath, cleanSub);
                }
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                fileName = sanitizeFileName(req.fileName);
                fullPath = path.join(targetDir, fileName);
                fs.writeFileSync(fullPath, req.content, 'utf-8');
                return [2 /*return*/, { success: true, savedPath: fullPath }];
            }
            catch (err) {
                return [2 /*return*/, { success: false, error: err.message || 'Fehler beim Speichern der Notiz.' }];
            }
            return [2 /*return*/];
        });
    }); });
    // Save Custom Note (arbitrary file path)
    ipcMain.handle('save-custom-note', function (_event, filePath, content) { return __awaiter(_this, void 0, void 0, function () {
        var dir;
        return __generator(this, function (_a) {
            try {
                dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(filePath, content, 'utf-8');
                return [2 /*return*/, { success: true, savedPath: filePath }];
            }
            catch (err) {
                return [2 /*return*/, { success: false, error: err.message }];
            }
            return [2 /*return*/];
        });
    }); });
    // Open in Obsidian
    ipcMain.handle('open-in-obsidian', function (_event, vaultPath, filePath) { return __awaiter(_this, void 0, void 0, function () {
        var vaultName, relPath, uri, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 6]);
                    if (!(vaultPath && filePath.startsWith(vaultPath))) return [3 /*break*/, 2];
                    vaultName = path.basename(vaultPath);
                    relPath = path.relative(vaultPath, filePath).replace(/\\/g, '/');
                    uri = "obsidian://open?vault=".concat(encodeURIComponent(vaultName), "&file=").concat(encodeURIComponent(relPath));
                    return [4 /*yield*/, shell.openExternal(uri)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2: return [4 /*yield*/, shell.openPath(filePath)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, true];
                case 4:
                    e_1 = _a.sent();
                    return [4 /*yield*/, shell.openPath(filePath)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, true];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    // Open in Explorer
    ipcMain.handle('open-in-explorer', function (_event, filePath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                shell.showItemInFolder(filePath);
                return [2 /*return*/, true];
            }
            catch (_b) {
                return [2 /*return*/, false];
            }
            return [2 /*return*/];
        });
    }); });
    // Settings
    ipcMain.handle('get-settings', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, loadSettings()];
        });
    }); });
    ipcMain.handle('save-settings', function (_event, settings) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, saveSettingsToDisk(settings)];
        });
    }); });
}
