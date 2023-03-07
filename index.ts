// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

// 'use strict';


import Driver from './lib/driver.mjs';
import type { Configuration } from './lib/driver.mjs';
import Isolation from './lib/isolation.mjs';
import RowMode from './lib/rowmode.mjs';
import Pool from './lib/pool.mjs';
import type Conn from './lib/connection.mjs';
import type Res from './lib/resultset.mjs';
import type { Rows } from './lib/resultset.mjs';


interface Connection {
    execute: Conn["execute"],
    close: Conn["close"],
    commit: Conn["commit"],
    rollback: Conn["rollback"]
}
type ResultSet = {
    close: Res["close"],
    getRows: Res["getRows"]
} 

const lib = {
    Driver,
    Isolation,
    RowMode,
    Pool
}

export {
    Driver,
    Isolation,
    RowMode,
    Pool
} 

export type {
    Connection,
    ResultSet,
    Rows,
    Configuration
}

export default lib;
