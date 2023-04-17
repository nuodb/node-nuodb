import Driver from './lib/driver';
import type { Configuration } from './lib/driver';
import Isolation from './lib/isolation';
import RowMode from './lib/rowmode';
import Pool from './lib/pool';
import type { PoolConfiguration } from './lib/pool';
import type Conn from './lib/connection';
import type Res from './lib/resultset';
import type { Rows } from './lib/resultset';
interface Connection {
    execute: Conn["execute"];
    close: Conn["close"];
    commit: Conn["commit"];
    rollback: Conn["rollback"];
}
type ResultSet = {
    close: Res["close"];
    getRows: Res["getRows"];
};
declare const lib: {
    Driver: typeof Driver;
    Isolation: {
        CONSISTENT_READ: number;
        READ_COMMITTED: number;
    };
    RowMode: {
        ROWS_AS_ARRAY: number;
        ROWS_AS_OBJECT: number;
    };
    Pool: typeof Pool;
};
export { Driver, Isolation, RowMode, Pool };
export type { Connection, ResultSet, Rows, Configuration, PoolConfiguration };
export default lib;
