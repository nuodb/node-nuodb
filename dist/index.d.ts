import Driver from './lib/driver.mjs';
import type { Configuration } from './lib/driver.mjs';
import Isolation from './lib/isolation.mjs';
import RowMode from './lib/rowmode.mjs';
import Pool from './lib/pool.mjs';
import type { PoolConfiguration } from './lib/pool.mjs';
import type Conn from './lib/connection.mjs';
import type Res from './lib/resultset.mjs';
import type { Rows } from './lib/resultset.mjs';
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
