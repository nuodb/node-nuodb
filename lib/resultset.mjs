"use strict";
// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// for environment variable swapping
var GET_ROWS_ENV_VAR = 'NUONODE_GET_ROWS_TYPE';
var GET_ROWS_TYPE_BLOCKING = 'BLOCKING';
var GET_ROWS_TYPE_MIN_BLOCKING = 'MIN_BLOCKING';
var util_1 = require("util");
var loopDefer_mjs_1 = require("./loopDefer.mjs");
var ResultSet = /** @class */ (function () {
    function ResultSet() {
        var _this = this;
        this.close = function (callback) {
            _this._close(function (err) {
                !!callback && callback(err);
            });
        };
        this._close = this.close;
        this.closePromisified = util_1["default"].promisify(this.close);
        this.getRows = function (number, callback) {
            if (typeof callback != 'undefined') {
                var extension = function (err, instance) {
                    if (err) {
                        callback(err);
                    }
                    // add future caching support here... (streams)
                    callback(null, instance);
                };
                callback = extension;
            }
            return _this._getRows(number, callback);
        };
        this._getRows = this.getRows;
        this.getRowsPromisified = util_1["default"].promisify(this.getRows);
        // seed batch size with an arbitrary number to prevent unwitting hogging of the main event loop
    }
    ResultSet.prototype.nonBlockingGetRows = function () {
        var _this = this;
        var numRows = null;
        var batchSize = null;
        var callback = null;
        var args = [].slice.call(arguments);
        // parse the args, and maintain callback support
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'number' && numRows === null) {
                numRows = args[i];
            }
            else if (typeof args[i] === 'number' && batchSize === null) {
                batchSize = args[i];
            }
            else if (typeof args[i] === 'function') {
                callback = args[i];
            }
            else {
                console.error("unrecognized argument ".concat(args[i], " of type ").concat(typeof args[i]));
            }
        }
        // default values
        numRows !== null && numRows !== void 0 ? numRows : (numRows = 0);
        batchSize !== null && batchSize !== void 0 ? batchSize : (batchSize = 1000);
        return (0, loopDefer_mjs_1["default"])({
            props: [],
            // setup: (p) => {console.log('setup exec'); return p},
            // because we modify the props rather than reconstructing and returning, we only really need the loop condition
            loopCondition: function (rows) { return __awaiter(_this, void 0, void 0, function () {
                var rowsNeeded, rowsToGet, nextBatch, totalRows, getMoreRows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            rowsNeeded = numRows === 0 ? batchSize : numRows - rows.length;
                            rowsToGet = Math.min(rowsNeeded, batchSize);
                            return [4 /*yield*/, this.getRowsPromisified(rowsToGet)];
                        case 1:
                            nextBatch = _a.sent();
                            totalRows = rows === null || rows === void 0 ? void 0 : rows.push.apply(rows, nextBatch);
                            getMoreRows = !( // stop only if
                            // we requested more than we received (end of result set)
                            nextBatch.length < rowsToGet
                                // we have received in total the amount we requested (totalRows should be > 0 at this point for the case of wanting all rows)
                                || totalRows === numRows);
                            return [2 /*return*/, getMoreRows];
                    }
                });
            }); },
            closure: callback
        });
    };
    ResultSet.prototype.extend = function (resultset, connection, driver) {
        var _a;
        Object.defineProperties(resultset, {
            _driver: {
                value: driver
            },
            _connection: {
                value: connection
            },
            close: {
                value: this.closePromisified,
                enumerable: true,
                writable: true
            },
            getRows: {
                value: process.env[GET_ROWS_ENV_VAR] === GET_ROWS_TYPE_BLOCKING ? this.getRowsPromisified : this.nonBlockingGetRows,
                enumerable: true,
                writable: true
            },
            getRowsStyle: {
                value: (_a = process.env[GET_ROWS_ENV_VAR]) !== null && _a !== void 0 ? _a : GET_ROWS_TYPE_MIN_BLOCKING,
                writable: false
            }
        });
    };
    return ResultSet;
}());
exports["default"] = ResultSet;
