import Connection from './connection.mjs';
import Driver from './driver.mjs';
interface ResultSet {
    close: (callback?: Function) => void;
    _close: ResultSet["close"];
    closePromisified: any;
    getRows: any;
    _getRows: ResultSet["getRows"];
    getRowsPromisified: any;
    nonBlockingGetRows: () => Promise<any[]>;
    extend: (resultset: ResultSet, connection: Connection, driver: Driver) => void;
}
declare const ResultSet: ResultSet;
export declare const extend: (resultset: ResultSet, connection: Connection, driver: Driver) => void;
export default ResultSet;
