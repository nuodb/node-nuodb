// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

// for environment variable swapping
const GET_ROWS_ENV_VAR = 'NUONODE_GET_ROWS_TYPE'
const GET_ROWS_TYPE_BLOCKING = 'BLOCKING'
const GET_ROWS_TYPE_MIN_BLOCKING = 'MIN_BLOCKING'

import util from 'util';
import Connection from './connection.mjs';
import Driver from './driver.mjs';
import loopDefer from './loopDefer.mjs';



interface ResultSet {
  close: (callback?: Function) => void,
  _close: ResultSet["close"],
  closePromisified: any,
  getRows: any,//(number?: number, callback?: Function) => Promise<unknown[]>,
  _getRows: ResultSet["getRows"],
  getRowsPromisified: any,
  nonBlockingGetRows: () => Promise<any[]>, //!
  extend: (resultset: ResultSet, connection: Connection, driver: Driver) => void
}

// @ts-ignore as we guarantee that all the props are added, but not on initial definition
const ResultSet: ResultSet = {

  close(callback?: Function) {
    this._close((err: Error) => {
      !!callback && callback(err);
    });
  },
  
  // getRows(number?: number, callback?: Function): any/*Promise<unknown>*/ {
  getRows(...args: any[]): any {
    let cbIdx = 0; 
    while (cbIdx < args.length) {
      if (typeof args[cbIdx] === 'function') {
        break;
      } cbIdx++;
    }
    const callback = args[cbIdx];

    const extension = (err: Error, instance: any/*Rows*/) => {
      if (err) { callback(err); }
      // add future caching support here... (streams)
      callback(null, instance);
    };
    args[cbIdx] = extension;
    
    this._getRows(...args); 
  }

}

ResultSet.closePromisified = util.promisify(ResultSet.close);
ResultSet.getRowsPromisified = util.promisify(ResultSet.getRows);

ResultSet.nonBlockingGetRows = function (...args: any[]): Promise<any[]> {
  const resultset = this;
  let numRows: null|number = null;
  let batchSize: null|number = null satisfies null;
  let callback: null|((err: unknown, val?: any) => void) = null;
  

  // parse the args, and maintain callback support
  for(let i = 0; i < args.length; i++) {
    if (typeof args[i] === 'number' && numRows === null) {
      numRows = args[i];
    } else if (typeof args[i] === 'number' && batchSize === null) {
      batchSize = args[i];
    } else if (typeof args[i] === 'function') {
      callback = args[i];
    } else {
      console.error(`unrecognized argument ${args[i]} of type ${typeof args[i]}`)
    }
  }
  
  // default values
  numRows ??= 0;
  batchSize ??= 1000;
  return loopDefer({
    props: [],
    // setup: (p) => {console.log('setup exec'); return p},
    // because we modify the props rather than reconstructing and returning, we only really need the loop condition
    loopCondition: async function (rows: any[]): Promise<boolean> {
      // calculate number of rows to get, avoid getting more rows than we are asked to get
      const rowsNeeded: number = numRows === 0 ? batchSize as number : (numRows as number) - rows.length;
      const rowsToGet: number = Math.min(rowsNeeded, batchSize as number)

      // get the rows and add them to props.rows.
      const nextBatch: unknown[] = await ResultSet.getRowsPromisified.call(resultset, rowsToGet);
      const totalRows = rows.push(...nextBatch);

      const getMoreRows = !( // stop only if
        // we requested more than we received (end of result set)
        nextBatch.length < rowsToGet
        // we have received in total the amount we requested (totalRows should be > 0 at this point for the case of wanting all rows)
        || totalRows === numRows
      )
      return getMoreRows
    },
    ...(!!callback) && {closure: callback}//(props?: any[] | undefined) => void,
  });
}


ResultSet.extend = (resultset: ResultSet, connection: Connection, driver: Driver): void => {
  Object.defineProperties(resultset,
    {
      _driver: {
        value: driver
      },
      _connection: {
        value: connection
      },
      _close: {
        value: resultset.close
      },
      close: {  
        value: ResultSet.closePromisified,
        enumerable: true,
        writable: true
      },
      _getRows: {
        value: resultset.getRows
      },
      getRows: {     
        value: process.env[GET_ROWS_ENV_VAR] === GET_ROWS_TYPE_BLOCKING ? ResultSet.getRowsPromisified : ResultSet.nonBlockingGetRows,
        enumerable: true,
        writable: true
      },
      getRowsStyle: {
        value: process.env[GET_ROWS_ENV_VAR] ?? GET_ROWS_TYPE_MIN_BLOCKING,
        writable: false
      }
    }
  );
}

export const { extend } = ResultSet;
export default ResultSet;