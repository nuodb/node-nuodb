import Driver from './lib/driver.mjs';
import Isolation from './lib/isolation.mjs';
import RowMode from './lib/rowmode.mjs';
import Pool from './lib/pool.mjs';
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
export default lib;
