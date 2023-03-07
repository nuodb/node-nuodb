import Connection from "./connection.mjs";
import { Configuration } from "./driver.mjs";
export interface PoolConfiguration {
    minAvailable: number;
    connectionConfig: Configuration;
    maxAge: number;
    checkTime: number;
    maxLimit: number;
    connectionRetryLimit: number;
    skipCheckLivelinessOnRelease: boolean;
    livelinessCheck: 'query' | string;
}
export default class Pool {
    static STATE_INITIALIZING: string;
    static STATE_RUNNING: string;
    static STATE_CLOSING: string;
    static STATE_CLOSED: string;
    static LIVELINESS_RUNNING: string;
    static LIVELINESS_NOT_RUNNING: string;
    private config;
    private all_connections;
    private free_connections;
    private state;
    private livelinessStatus;
    private livelinessInterval;
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
    releaseConnection(connection: Connection): Promise<void>;
    closePool(): Promise<void>;
}
