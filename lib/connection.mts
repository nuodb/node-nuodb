// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';


import ResultSet, { CloseCallback } from './resultset.mjs';
import assert from 'assert';
import util from 'util';

import type Driver from './driver.mjs';



type Data = Array<string|number|null>;  //? Elaborate on acceptable datatypes
interface Options {
  autocommit?: boolean,
  queryTimeout?: number,
  rowMode?: 0|1,
  readonly?: boolean,
  fetchSize?: number,
  isolationLevel?: number
};
type ResultsCallback = (err: unknown, results: ResultSet) => void;

type Execute = (sql: string, data?: Data, options?: Options, callback?: ResultsCallback) => Promise<Pick<ResultSet, 'close'|'getRows'>|undefined>;  // only exposing close and getRows methods

interface Connection {
  _id: number,
  execute: typeof execute,
  _execute: Execute,
  executePromisified: Execute,
  close: (callback?: CloseCallback) => Promise<void>,
  _close: Connection["close"],
  _defaultClose: Connection["close"]; // set for pool connection
  closePromisified: (close: (callback?: ResultsCallback) => void) => Promise<unknown>,
  commit: (callback: ResultsCallback) => void,
  _commit: Connection["commit"],
  commitPromisified: (commit: (callback: ResultsCallback) => Function) => Promise<unknown>,
  rollback: (callback: ResultsCallback) => void,
  _rollback: Connection["rollback"],
  rollbackPromisified: (rollback: (callback: ResultsCallback) => void) => Promise<unknown>,
  extend: (connection: Connection, driver: Driver) => void,
  _driver: Driver,
  hasFailed: () => boolean  // added in C++ addon binding
}

// interface Connection {

// }

function execute(sql: string, callback?: ResultsCallback): Promise<ResultSet|undefined>;
function execute(sql: string, data: Data, callback?: ResultsCallback): Promise<ResultSet|undefined>;
function execute(sql: string, options: Options, callback?: ResultsCallback): Promise<ResultSet|undefined>;
function execute(sql: string, data: Data, options: Options, callback: ResultsCallback): Promise<ResultSet|undefined>;
function execute(...args: Array<string|Data|Options|ResultsCallback|undefined>) {
  //@ts-ignore as "this" will bind to the Connection object
  const conn = this;
  assert(args.length > 0);

  // n.b. the original callback is always the first form provided
  let cbIdx = 0;
  while (cbIdx < args.length) {
    if (typeof args[cbIdx] === 'function') {
      break;
    }
    cbIdx++;
  }
  assert(typeof args[cbIdx] === 'function');
  const callback = args[cbIdx] as Function;

  const extension = function (err: unknown, resultSet: ResultSet) {
    if (!!err) {
      callback(err);
      return;
    }
    if (!!resultSet) {
      ResultSet.extend(resultSet, conn, conn._driver);
    }
    callback(null, resultSet);
  };
  args[cbIdx] = extension;
  
  //@ts-ignore as "this" will bind to the Connection object
  return this._execute(...args);  
}




//@ts-ignore as we guarantee that all the props are added, but not on initial definition
const Connection: Connection = {
  _id: 0,
  execute: execute,
  close(callback?: Function) {
    return this._close(function (err: unknown) {
      !!callback && callback(err);
    });
  },

  commit(callback: Function) {
    this._commit(function (err: unknown) {
      callback(err);
    });
  },

  rollback(callback: Function) {
    this._rollback(function (err: unknown) {
      callback(err);
    });
  }
}

Connection.executePromisified = util.promisify(Connection.execute);
Connection.closePromisified = util.promisify(Connection.close);
Connection._defaultClose = Connection.close;
Connection.commitPromisified = util.promisify(Connection.commit);
Connection.rollbackPromisified = util.promisify(Connection.rollback);


Connection.extend = (connection: Connection, driver: Driver) => {
  Object.defineProperties(
    connection,
    {
      _driver: {
        value: driver
      },
      _close: {
        value: connection.close
      },
      close: {
        value: Connection.closePromisified,
        enumerable: true,
        writable: true
      },
      _commit: {
        value: connection.commit
      },
      commit: {
        value: Connection.commitPromisified,
        enumerable: true,
        writable: true
      },
      _rollback: {
        value: connection.rollback
      },
      rollback: {
        value: Connection.rollbackPromisified,
        enumerable: true,
        writable: true
      },
      _execute: {
        value: connection.execute
      },
      execute: {
        value: Connection.executePromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}


export default Connection;
