import Connection from './connection.js';
export interface Configuration {
    hostname?: string;
    port?: string;
    database: string;
    schema?: string;
    user: string;
    password: string;
    verifyHostname?: 'false' | 'true';
    allowSRPFallback?: 'false' | 'true';
}
type ConnectionCallback = (err: unknown, connection: Connection) => void;
type Connect = (config: Configuration, callback?: ConnectionCallback) => Promise<Pick<Connection, 'execute' | 'close' | 'commit' | 'rollback'>>;
declare class Driver {
    private defaults;
    private _connect;
    connect: Connect;
    private _driver;
    constructor();
    private merge;
}
export default Driver;
