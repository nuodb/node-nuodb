import ResultSet, { CloseCallback } from './resultset.mjs';
import type Driver from './driver.mjs';
type Data = Array<string | number | null>;
interface Options {
    autocommit?: boolean;
    queryTimeout?: number;
    rowMode?: 0 | 1;
    readonly?: boolean;
    fetchSize?: number;
    isolationLevel?: number;
}
type ResultsCallback = (err: unknown, results: ResultSet) => void;
type Execute = (sql: string, data?: Data, options?: Options, callback?: ResultsCallback) => Promise<Pick<ResultSet, 'close' | 'getRows'> | undefined>;
interface Connection {
    _id: number;
    execute: typeof execute;
    _execute: Execute;
    executePromisified: Execute;
    close: (callback?: CloseCallback) => Promise<void>;
    _close: Connection["close"];
    _defaultClose: Connection["close"];
    closePromisified: (close: (callback?: ResultsCallback) => void) => Promise<unknown>;
    commit: (callback: ResultsCallback) => void;
    _commit: Connection["commit"];
    commitPromisified: (commit: (callback: ResultsCallback) => Function) => Promise<unknown>;
    rollback: (callback: ResultsCallback) => void;
    _rollback: Connection["rollback"];
    rollbackPromisified: (rollback: (callback: ResultsCallback) => void) => Promise<unknown>;
    extend: (connection: Connection, driver: Driver) => void;
    _driver: Driver;
    hasFailed: () => boolean;
}
declare function execute(sql: string, callback?: ResultsCallback): Promise<ResultSet | undefined>;
declare function execute(sql: string, data: Data, callback?: ResultsCallback): Promise<ResultSet | undefined>;
declare function execute(sql: string, options: Options, callback?: ResultsCallback): Promise<ResultSet | undefined>;
declare function execute(sql: string, data: Data, options: Options, callback: ResultsCallback): Promise<ResultSet | undefined>;
declare const Connection: Connection;
export default Connection;
