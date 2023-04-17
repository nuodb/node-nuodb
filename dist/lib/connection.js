// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resultset_js_1 = __importDefault(require("./resultset.js"));
const assert_1 = __importDefault(require("assert"));
const util_1 = __importDefault(require("util"));
;
function execute(...args) {
    //@ts-ignore as "this" will bind to the Connection object
    const conn = this;
    (0, assert_1.default)(args.length > 0);
    // n.b. the original callback is always the first form provided
    let cbIdx = 0;
    while (cbIdx < args.length) {
        if (typeof args[cbIdx] === 'function') {
            break;
        }
        cbIdx++;
    }
    (0, assert_1.default)(typeof args[cbIdx] === 'function');
    const callback = args[cbIdx];
    const extension = function (err, resultSet) {
        if (!!err) {
            callback(err);
            return;
        }
        if (!!resultSet) {
            resultset_js_1.default.extend(resultSet, conn, conn._driver);
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
Connection.executePromisified = util_1.default.promisify(Connection.execute);
Connection.closePromisified = util_1.default.promisify(Connection.close);
Connection._defaultClose = Connection.close;
Connection.commitPromisified = util_1.default.promisify(Connection.commit);
Connection.rollbackPromisified = util_1.default.promisify(Connection.rollback);
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
exports.default = Connection;
//# sourceMappingURL=connection.js.map