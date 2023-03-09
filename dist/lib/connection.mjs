// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
'use strict';
import ResultSet from './resultset.mjs';
import assert from 'assert';
import util from 'util';
;
function execute(...args) {
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
    const callback = args[cbIdx];
    const extension = function (err, resultSet) {
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
const Connection = {
    _id: 0,
    execute: execute,
    close(callback) {
        return this._close(function (err) {
            !!callback && callback(err);
        });
    },
    commit(callback) {
        this._commit(function (err) {
            callback(err);
        });
    },
    rollback(callback) {
        this._rollback(function (err) {
            callback(err);
        });
    }
};
Connection.executePromisified = util.promisify(Connection.execute);
Connection.closePromisified = util.promisify(Connection.close);
Connection._defaultClose = Connection.close;
Connection.commitPromisified = util.promisify(Connection.commit);
Connection.rollbackPromisified = util.promisify(Connection.rollback);
Connection.extend = (connection, driver) => {
    Object.defineProperties(connection, {
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
    });
};
export default Connection;
//# sourceMappingURL=connection.mjs.map