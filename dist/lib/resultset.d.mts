import Connection from './connection.mjs';
import Driver from './driver.mjs';
type CloseCallback = (err: unknown) => void;
interface ResultSet {
    close: (callback?: CloseCallback) => Promise<void>;
    _close: ResultSet["close"];
    closePromisified: ResultSet["close"];
    getRows: typeof getRows;
    _getRows: ResultSet["getRows"];
    getRowsPromisified: ResultSet["getRows"];
    nonBlockingGetRows: ResultSet["getRows"];
    extend: (resultset: ResultSet, connection: Connection, driver: Driver) => void;
}
export type Rows = {
    [prop: string]: string | number;
}[];
type RowsCallback = (err: unknown, rows?: Rows) => void;
declare function getRows(callback?: RowsCallback): Promise<Rows>;
declare function getRows(size: number, callback?: RowsCallback): Promise<Rows>;
declare const ResultSet: ResultSet;
export declare const extend: (resultset: ResultSet, connection: Connection, driver: Driver) => void;
export default ResultSet;
