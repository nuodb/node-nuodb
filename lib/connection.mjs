"use strict";
// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
exports.__esModule = true;
var resultset_mjs_1 = require("./resultset.mjs");
var assert_1 = require("assert");
var util_1 = require("util");
var Connection = /** @class */ (function () {
    function Connection() {
        var _this = this;
        this._id = 0;
        this.execute = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            // const args = [].slice.call(arguments);
            (0, assert_1["default"])(args.length > 0);
            // n.b. the original callback is always the first form provided
            var cbIdx = 0;
            do {
                if (typeof args[cbIdx] === 'function') {
                    break;
                }
                cbIdx++;
            } while (cbIdx < args.length);
            (0, assert_1["default"])(typeof args[cbIdx] === 'function');
            var callback = args[cbIdx];
            var extension = function (err, instance) {
                if (err) {
                    callback(err);
                    return;
                }
                if (!!instance) { // neither undefined nor null
                    //@ts-ignore    //? Confident extend method does exist, and ts is screaming for some reason
                    resultset_mjs_1["default"].extend(instance, this, this._driver);
                }
                callback(null, instance);
            };
            args[cbIdx] = extension;
            return _this._execute(args);
        };
        this._execute = this.execute;
        this.executePromisified = util_1["default"].promisify(this.execute);
        this.close = function (callback) {
            _this._close(function (err) {
                !!callback && callback(err);
            });
        };
        this._close = this.close;
        this._defaultClose = this.close;
        this.closePromisified = util_1["default"].promisify(this.close);
        this.commit = function (callback) {
            _this._commit(function (err) {
                callback(err);
            });
        };
        this._commit = this.commit;
        this.commitPromisified = util_1["default"].promisify(this.commit);
        this.rollback = function (callback) {
            _this._rollback(function (err) {
                callback(err);
            });
        };
        this._rollback = this.rollback;
        this.rollbackPromisified = util_1["default"].promisify(this.rollback);
    }
    Connection.extend = function (connection, driver) {
        Object.defineProperties(connection, {
            _driver: {
                value: driver
            },
            close: {
                value: connection.closePromisified,
                enumerable: true,
                writable: true
            },
            _commit: {
                value: connection.commit
            },
            commit: {
                value: connection.commitPromisified,
                enumerable: true,
                writable: true
            },
            _rollback: {
                value: connection.rollback
            },
            rollback: {
                value: connection.rollbackPromisified,
                enumerable: true,
                writable: true
            },
            _execute: {
                value: connection.execute
            },
            execute: {
                value: connection.executePromisified,
                enumerable: true,
                writable: true
            }
        });
    };
    return Connection;
}());
exports["default"] = Connection;
