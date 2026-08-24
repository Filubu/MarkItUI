import { ConversionRequest, ConversionResult } from '../shared/types';
export declare class ConverterBridge {
    private static findPythonExecutable;
    private static getWorkerScriptPath;
    static convert(req: ConversionRequest, customPythonPath?: string): Promise<ConversionResult>;
}
