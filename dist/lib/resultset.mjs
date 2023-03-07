// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// for environment variable swapping
const GET_ROWS_ENV_VAR = 'NUONODE_GET_ROWS_TYPE';
const GET_ROWS_TYPE_BLOCKING = 'BLOCKING';
const GET_ROWS_TYPE_MIN_BLOCKING = 'MIN_BLOCKING';
import util from 'util';
import loopDefer from './loopDefer.mjs';
function getRows(...args) {
    let cbIdx = 0;
    while (cbIdx < args.length) {
        if (typeof args[cbIdx] === 'function') {
            break;
        }
        cbIdx++;
    }
    const callback = args[cbIdx];
    const extension = (err, instance) => {
        if (err) {
            callback(err);
        }
        // add future caching support here... (streams)
        callback(null, instance);
    };
    args[cbIdx] = extension;
    //@ts-ignore as "this" binds to the ResultSet object
    return this._getRows(...args);
}
// @ts-ignore as we guarantee that all the props are added, but not on initial definition
const ResultSet = {
    close(callback) {
        return this._close((err) => {
            !!callback && callback(err);
        });
    },
    getRows: getRows
};
ResultSet.closePromisified = util.promisify(ResultSet.close);
//@ts-ignore
ResultSet.getRowsPromisified = util.promisify(ResultSet.getRows);
function nonBlockingGetRows(...args) {
    //@ts-ignore as "this" will bind to the ResultSet object
    const resultset = this;
    let numRows = null;
    let batchSize = null;
    let callback = null;
    // parse the args, and maintain callback support
    for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'number' && numRows === null) {
            numRows = args[i];
        }
        else if (typeof args[i] === 'number' && batchSize === null) {
            batchSize = args[i]; //! Is this supposed to be another integer paramater? Would have to add another overload
        }
        else if (typeof args[i] === 'function') {
            callback = args[i];
        }
        else {
            console.error(`unrecognized argument ${args[i]} of type ${typeof args[i]}`);
        }
    }
    // default values
    numRows !== null && numRows !== void 0 ? numRows : (numRows = 0);
    batchSize !== null && batchSize !== void 0 ? batchSize : (batchSize = 1000);
    return loopDefer(Object.assign({ props: [], 
        // setup: (p) => {console.log('setup exec'); return p},
        // because we modify the props rather than reconstructing and returning, we only really need the loop condition
        loopCondition: function (rows) {
            return __awaiter(this, void 0, void 0, function* () {
                // calculate number of rows to get, avoid getting more rows than we are asked to get
                const rowsNeeded = numRows === 0 ? batchSize : numRows - rows.length;
                const rowsToGet = Math.min(rowsNeeded, batchSize);
                // get the rows and add them to props.rows.
                const nextBatch = yield ResultSet.getRowsPromisified.call(resultset, rowsToGet);
                const totalRows = rows.push(...nextBatch);
                const getMoreRows = !( // stop only if
                // we requested more than we received (end of result set)
                nextBatch.length < rowsToGet
                    // we have received in total the amount we requested (totalRows should be > 0 at this point for the case of wanting all rows)
                    || totalRows === numRows);
                return getMoreRows;
            });
        } }, (!!callback) && { closure: callback }));
}
ResultSet.nonBlockingGetRows = nonBlockingGetRows;
ResultSet.extend = (resultset, connection, driver) => {
    var _a;
    Object.defineProperties(resultset, {
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
            value: (_a = process.env[GET_ROWS_ENV_VAR]) !== null && _a !== void 0 ? _a : GET_ROWS_TYPE_MIN_BLOCKING,
            writable: false
        }
    });
};
export const { extend } = ResultSet;
export default ResultSet;
//# sourceMappingURL=resultset.mjs.map