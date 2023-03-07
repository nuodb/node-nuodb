import Connection from './connection.mjs';
export interface Configuration {
    hostname?: string;
    port?: string;
    database?: string;
    schema?: string;
    user?: string;
    password?: string;
    verifyHostname?: 'false' | 'true';
    allowSRPFallback?: 'false' | 'true';
}
type Connect<T = undefined> = (config: Configuration, callback?: (err: Error, connection: Connection) => void) => T extends 'Promise' ? Promise<Connection> : Connection;
declare class Driver {
    private defaults;
    private _connect;
    connect: Connect<'Promise'>;
    private _driver;
    constructor();
    private merge;
}
export default Driver;
