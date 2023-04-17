/// <reference types="node" />
import Connection from "./connection.js";
import { Configuration } from "./driver.js";
export interface PoolConfiguration {
    minAvailable: number;
    connectionConfig: Configuration;
    maxAge: number;
    checkTime: number;
    maxLimit: number;
    connectionRetryLimit: number;
    skipCheckLivelinessOnRelease?: boolean;
    livelinessCheck?: 'query' | string;
}
interface AllConnections {
    [connection: string]: {
        connection?: Connection;
        inUse: boolean;
        ageOutID: null | NodeJS.Timeout | number;
        ageStatus: boolean;
    };
}
type FreeConnections = Connection[];
export default class Pool {
    static STATE_INITIALIZING: string;
    static STATE_RUNNING: string;
    static STATE_CLOSING: string;
    static STATE_CLOSED: string;
    static LIVELINESS_RUNNING: string;
    static LIVELINESS_NOT_RUNNING: string;
    config: PoolConfiguration;
    all_connections: AllConnections;
    free_connections: FreeConnections;
    state: string;
    livelinessStatus: string;
    livelinessInterval: undefined | NodeJS.Timer;
    constructor(args: PoolConfiguration);
    init(): Promise<void>;
    _connectionBelongs(connection: Connection): boolean;
    _checkConnection(connection: Connection): Promise<null | boolean>;
    _livelinessCheck(): Promise<void>;
    _checkFreeAndRemove(_id: number): boolean;
    _checkAllAndRemove(_id: number): Promise<void>;
    _populationCheck(): Promise<void>;
    _closeConnection(_id: number): Promise<void>;
    _makeConnection(): Promise<Connection>;
    _createConnection(): Promise<Connection>;
    requestConnection(): Promise<Connection | undefined>;
    releaseConnection(connection: Partial<Connection>): Promise<void>;
    closePool(): Promise<void>;
}
export {};
