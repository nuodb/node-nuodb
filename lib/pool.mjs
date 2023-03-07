"use strict";
// Copyright (c) 2018-2022, NuoDB, Inc.
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
var driver_mjs_1 = require("./driver.mjs");
var REQUIRED_INITIAL_ARGUMENTS = ["connectionConfig"];
var Pool = /** @class */ (function () {
    function Pool(args) {
        var _this = this;
        var _a, _b, _c, _d;
        REQUIRED_INITIAL_ARGUMENTS.forEach(function (arg) {
            if (!(arg in args)) {
                throw new Error("cannot find required argument ".concat(arg, " in constructor arguments"));
            }
        });
        this.config = {
            minAvailable: args.minAvailable || 10,
            connectionConfig: args.connectionConfig,
            maxAge: args.maxAge || 300000,
            checkTime: (_a = args.checkTime) !== null && _a !== void 0 ? _a : 120000,
            maxLimit: (_b = args.maxLimit) !== null && _b !== void 0 ? _b : 200,
            connectionRetryLimit: args.connectionRetryLimit || 5,
            skipCheckLivelinessOnRelease: (_c = args.skipCheckLivelinessOnRelease) !== null && _c !== void 0 ? _c : false,
            livelinessCheck: (_d = args.livelinessCheck) !== null && _d !== void 0 ? _d : 'query'
        };
        //? this.poolId = args.id || new Date().getTime();
        this.all_connections = {};
        this.free_connections = [];
        this.state = Pool.STATE_INITIALIZING;
        this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
        //start liveliness check
        if (this.config.checkTime != 0) {
            this.livelinessInterval = setInterval(function () { return _this._livelinessCheck(); }, this.config.checkTime);
        }
        else
            this.livelinessInterval = null;
    }
    // populate the pool and prepare for use
    Pool.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var i, newConn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < this.config.minAvailable)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._createConnection()];
                    case 2:
                        newConn = _a.sent();
                        this.free_connections.push(newConn);
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.state = Pool.STATE_RUNNING;
                        return [2 /*return*/];
                }
            });
        });
    };
    //verify that connection belongs in this pool
    Pool.prototype._connectionBelongs = function (connection) {
        if (this.all_connections[connection._id] === undefined) {
            return false;
        }
        if (this.all_connections[connection._id].connection === undefined) {
            return false;
        }
        return connection === this.all_connections[connection._id].connection;
    };
    // check connection is alive
    // First check if a liveliness check is desired and if so
    // check at least the connection believed to be connenected
    // and if indicated to full check by running a query
    // if any of the desired checks show a problem return false,
    // indicating the connection is a problem, otherwise return true
    Pool.prototype._checkConnection = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var retvalue, result, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        retvalue = true;
                        if (!(this.config.skipCheckLivelinessOnRelease === false)) return [3 /*break*/, 7];
                        if (!(connection.hasFailed() === false)) return [3 /*break*/, 6];
                        if (!(this.config.livelinessCheck.toLowerCase() === 'query')) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, connection.execute("SELECT 1 AS VALUE FROM DUAL")];
                    case 2:
                        result = _a.sent();
                        return [4 /*yield*/, result.close()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        retvalue = false;
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        retvalue = false;
                        _a.label = 7;
                    case 7: 
                    // if we get here it means either we want all connections put back in the pool or any of liveliness check
                    // performed, either a connection check or a full query all passed
                    return [2 /*return*/, retvalue];
                }
            });
        });
    };
    //connection will be checked when releaseConnection is called on it.
    Pool.prototype._livelinessCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checked, toCheck;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.livelinessStatus === Pool.LIVELINESS_RUNNING) {
                            return [2 /*return*/];
                        }
                        if (this.free_connections.length === 0) {
                            return [2 /*return*/];
                        }
                        this.livelinessStatus = Pool.LIVELINESS_RUNNING;
                        checked = {};
                        _a.label = 1;
                    case 1:
                        if (!(this.free_connections.length > 0)) return [3 /*break*/, 5];
                        toCheck = this.free_connections.shift();
                        this.all_connections[toCheck._id].inUse = true;
                        if (!(checked[toCheck._id] === true)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.releaseConnection(toCheck)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3:
                        checked[toCheck._id] = true;
                        return [4 /*yield*/, this.releaseConnection(toCheck)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 5:
                        this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype._checkFreeAndRemove = function (_id) {
        for (var i = 0; i < this.free_connections.length; i++) {
            if (this.free_connections[i]._id === _id) {
                this.free_connections.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    Pool.prototype._checkAllAndRemove = function (_id) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, ((_a = this.all_connections[_id].connection) === null || _a === void 0 ? void 0 : _a._defaultClose())];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _c.sent();
                        return [3 /*break*/, 3];
                    case 3:
                        clearTimeout((_b = this.all_connections[_id].ageOutID) !== null && _b !== void 0 ? _b : undefined);
                        delete this.all_connections[_id];
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype._populationCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var newConn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.config.minAvailable > Object.keys(this.all_connections).length)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._createConnection()];
                    case 1:
                        newConn = _a.sent();
                        this.free_connections.push(newConn);
                        return [2 /*return*/];
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype._closeConnection = function (_id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
                            return [2 /*return*/];
                        }
                        //if connection is inUse mark it for closure upon return to free_connections
                        if (this.all_connections[_id].inUse) {
                            this.all_connections[_id].ageStatus = true;
                            return [2 /*return*/];
                        }
                        this._checkFreeAndRemove(_id);
                        return [4 /*yield*/, this._checkAllAndRemove(_id)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._populationCheck()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype._makeConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var driver, connection, results, connId, thisPool, _id;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        driver = new driver_mjs_1["default"]();
                        return [4 /*yield*/, driver.connect(this.config.connectionConfig)];
                    case 1:
                        connection = _a.sent();
                        return [4 /*yield*/, connection.execute("SELECT GETCONNECTIONID() FROM DUAL")];
                    case 2:
                        results = _a.sent();
                        return [4 /*yield*/, results.getRows()];
                    case 3:
                        connId = _a.sent();
                        Object.defineProperty(connection, 'id', {
                            value: connId[0]["[GETCONNECTIONID]"]
                        });
                        thisPool = this;
                        connection._defaultClose = connection.close;
                        connection.close = function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, thisPool.releaseConnection(connection)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        _id = 0;
                        while (this.all_connections[_id] != undefined) {
                            _id++;
                        }
                        // Object.defineProperty(connection, "_id",  {
                        //   value: _id
                        // })
                        connection._id = _id;
                        this.all_connections[_id] = {
                            connection: connection,
                            ageStatus: false,
                            ageOutID: null,
                            inUse: false
                        };
                        this.all_connections[_id].ageOutID = setTimeout(function () { return _this._closeConnection(_id); }, this.config.maxAge);
                        return [2 /*return*/, connection];
                }
            });
        });
    };
    Pool.prototype._createConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error, connectionMade, tries, maxTries, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tries = 0;
                        maxTries = this.config.connectionRetryLimit;
                        _a.label = 1;
                    case 1:
                        if (!(tries < maxTries && connectionMade === undefined)) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this._makeConnection()];
                    case 3:
                        connectionMade = (_a.sent());
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        tries++;
                        error = err_1;
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 1];
                    case 6:
                        if (tries >= maxTries) {
                            throw error;
                        }
                        return [2 /*return*/, connectionMade];
                }
            });
        });
    };
    Pool.prototype.requestConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connectionToUse, connectionToUse;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.state === Pool.STATE_INITIALIZING) {
                            throw new Error("must initialize the pool before requesting a connection");
                        }
                        if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
                            throw new Error("the pool is closing or closed");
                        }
                        if (this.config.maxLimit > 0) {
                            if (Object.keys(this.all_connections).length >= this.config.maxLimit &&
                                this.free_connections.length === 0) {
                                throw new Error("connection hard limit reached");
                            }
                        }
                        if (!(this.free_connections.length > 0)) return [3 /*break*/, 1];
                        connectionToUse = this.free_connections.shift();
                        this.all_connections[connectionToUse._id].inUse = true;
                        return [2 /*return*/, connectionToUse];
                    case 1:
                        if (!(this.free_connections.length === 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this._createConnection()];
                    case 2:
                        connectionToUse = _a.sent();
                        this.all_connections[connectionToUse._id].inUse = true;
                        return [2 /*return*/, connectionToUse];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype.releaseConnection = function (connection) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var e_3, newConn, connectionAlive;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.state !== Pool.STATE_RUNNING) {
                            throw new Error("cannot release connections to a pool that is not running, current state: ".concat(this.state));
                        }
                        if (!this._connectionBelongs(connection)) {
                            throw new Error("connection is not from this pool");
                        }
                        if (this.all_connections[connection._id].inUse === false) {
                            throw new Error("cannot return a connection that has already been returned to the pool");
                        }
                        if (!(this.all_connections[connection._id].ageStatus === true)) return [3 /*break*/, 7];
                        clearTimeout((_a = this.all_connections[connection._id].ageOutID) !== null && _a !== void 0 ? _a : undefined);
                        delete this.all_connections[connection._id];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, connection._defaultClose()];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_3 = _b.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        if (!(this.free_connections.length < this.config.minAvailable)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this._createConnection()];
                    case 5:
                        newConn = _b.sent();
                        this.free_connections.push(newConn);
                        _b.label = 6;
                    case 6: return [2 /*return*/];
                    case 7: return [4 /*yield*/, this._checkConnection(connection)];
                    case 8:
                        connectionAlive = _b.sent();
                        if (!connectionAlive) return [3 /*break*/, 9];
                        this.all_connections[connection._id].inUse = false;
                        this.free_connections.push(connection);
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, this._closeConnection(connection._id)];
                    case 10:
                        _b.sent();
                        _b.label = 11;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype.closePool = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.state = Pool.STATE_CLOSING;
                        return [4 /*yield*/, Promise.all(Object.keys(this.all_connections).map(function (key) { return __awaiter(_this, void 0, void 0, function () {
                                var e_4;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, ((_a = this.all_connections[key].connection) === null || _a === void 0 ? void 0 : _a._defaultClose())];
                                        case 1:
                                            _c.sent();
                                            clearTimeout((_b = this.all_connections[key].ageOutID) !== null && _b !== void 0 ? _b : undefined);
                                            return [3 /*break*/, 3];
                                        case 2:
                                            e_4 = _c.sent();
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a.sent();
                        this.all_connections = {};
                        this.free_connections = [];
                        if (this.config.checkTime != 0) {
                            clearInterval(this.livelinessInterval);
                        }
                        this.state = Pool.STATE_CLOSED;
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.STATE_INITIALIZING = "initializing";
    Pool.STATE_RUNNING = "running";
    Pool.STATE_CLOSING = "closing";
    Pool.STATE_CLOSED = "closed";
    Pool.LIVELINESS_RUNNING = "liveliness running";
    Pool.LIVELINESS_NOT_RUNNING = "liveliness not running";
    return Pool;
}());
exports["default"] = Pool;
