// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

// 'use strict';


import Driver from './lib/driver';
import type { Configuration } from './lib/driver';
import Isolation from './lib/isolation';
import RowMode from './lib/rowmode';
import Pool from './lib/pool';
import type { PoolConfiguration } from './lib/pool';
import type Conn from './lib/connection';
import type Res from './lib/resultset';
import type { Rows } from './lib/resultset';

// Adjusted Connection and ResultSet to only expose the necessary methods publicly

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
    Configuration,
    PoolConfiguration
}

export default lib;
