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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const driver_js_1 = __importDefault(require("./driver.js"));
const REQUIRED_INITIAL_ARGUMENTS = ["connectionConfig"];
;
;
class Pool {
    constructor(args) {
        var _a, _b, _c, _d;
        this.livelinessInterval = undefined; //!
        REQUIRED_INITIAL_ARGUMENTS.forEach((arg) => {
            if (!(arg in args)) {
                throw new Error(`cannot find required argument ${arg} in constructor arguments`);
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
        // below not to be in use
        // this.poolId = args.id || new Date().getTime();
        this.all_connections = {};
        this.free_connections = [];
        this.state = Pool.STATE_INITIALIZING;
        this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
        //start liveliness check
        if (this.config.checkTime != 0) {
            this.livelinessInterval = setInterval(() => this._livelinessCheck(), this.config.checkTime);
        }
    }
    // populate the pool and prepare for use
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.config.minAvailable; i++) {
                const newConn = yield this._createConnection();
                this.free_connections.push(newConn);
            }
            this.state = Pool.STATE_RUNNING;
        });
    }
    //verify that connection belongs in this pool
    _connectionBelongs(connection) {
        if (this.all_connections[connection._id] === undefined) {
            return false;
        }
        if (this.all_connections[connection._id].connection === undefined) {
            return false;
        }
        return connection === this.all_connections[connection._id].connection;
    }
    // check connection is alive
    // First check if a liveliness check is desired and if so
    // check at least the connection believed to be connenected
    // and if indicated to full check by running a query
    // if any of the desired checks show a problem return false,
    // indicating the connection is a problem, otherwise return true
    _checkConnection(connection) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let retvalue = true;
            if (this.config.skipCheckLivelinessOnRelease === false) {
                if (connection.hasFailed() === false) {
                    if (((_a = this.config.livelinessCheck) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'query') {
                        try {
                            const result = yield connection.execute("SELECT 1 AS VALUE FROM DUAL");
                            yield result.close();
                        }
                        catch (e) {
                            retvalue = false;
                        }
                    }
                }
                else {
                    retvalue = false;
                }
            }
            // if we get here it means either we want all connections put back in the pool or any of liveliness check
            // performed, either a connection check or a full query all passed
            return retvalue;
        });
    }
    //connection will be checked when releaseConnection is called on it.
    _livelinessCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.livelinessStatus === Pool.LIVELINESS_RUNNING) {
                return;
            }
            if (this.free_connections.length === 0) {
                return;
            }
            this.livelinessStatus = Pool.LIVELINESS_RUNNING;
            const checked = {};
            while (this.free_connections.length > 0) {
                let toCheck = this.free_connections.shift();
                this.all_connections[toCheck._id].inUse = true;
                if (checked[toCheck._id] === true) {
                    yield this.releaseConnection(toCheck);
                    return;
                }
                checked[toCheck._id] = true;
                yield this.releaseConnection(toCheck);
            }
            this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
        });
    }
    _checkFreeAndRemove(_id) {
        for (let i = 0; i < this.free_connections.length; i++) {
            if (this.free_connections[i]._id === _id) {
                this.free_connections.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    _checkAllAndRemove(_id) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield ((_a = this.all_connections[_id].connection) === null || _a === void 0 ? void 0 : _a._defaultClose());
            }
            catch (e) {
                // continue regardless of error
            }
            clearTimeout((_b = this.all_connections[_id].ageOutID) !== null && _b !== void 0 ? _b : undefined);
            delete this.all_connections[_id];
        });
    }
    _populationCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.minAvailable > Object.keys(this.all_connections).length) {
                let newConn = yield this._createConnection();
                this.free_connections.push(newConn);
                return;
            }
            else {
                return;
            }
        });
    }
    _closeConnection(_id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
                return;
            }
            //if connection is inUse mark it for closure upon return to free_connections
            if (this.all_connections[_id].inUse) {
                this.all_connections[_id].ageStatus = true;
                return;
            }
            this._checkFreeAndRemove(_id);
            yield this._checkAllAndRemove(_id);
            yield this._populationCheck();
            return;
        });
    }
    _makeConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = new driver_js_1.default();
            let connection = yield driver.connect(this.config.connectionConfig);
            const results = yield connection.execute("SELECT GETCONNECTIONID() FROM DUAL");
            const connId = yield results.getRows();
            Object.defineProperty(connection, 'id', {
                value: connId[0]["[GETCONNECTIONID]"]
            });
            const thisPool = this;
            connection._defaultClose = connection.close;
            connection.close = () => __awaiter(this, void 0, void 0, function* () {
                yield thisPool.releaseConnection(connection);
            });
            let _id = 0;
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
                inUse: false,
            };
            this.all_connections[_id].ageOutID = setTimeout(() => this._closeConnection(_id), this.config.maxAge, 
            //@ts-ignore`//!!!
            _id);
            return connection;
        });
    }
    _createConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            let error;
            let connectionMade;
            let tries = 0;
            const maxTries = this.config.connectionRetryLimit;
            while (tries < maxTries && connectionMade === undefined) {
                try {
                    connectionMade = (yield this._makeConnection());
                }
                catch (err) {
                    tries++;
                    error = err;
                }
            }
            if (tries >= maxTries) {
                throw error;
            }
            return connectionMade;
        });
    }
    // async requestConnection(): Promise<Pick<Connection, "close"|"commit"|"execute"|"rollback">|undefined>;  // overload added to represent the publicly accessible Connection that only exposes these methods
    requestConnection() {
        return __awaiter(this, void 0, void 0, function* () {
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
            // if a connection is available, use free connection
            if (this.free_connections.length > 0) {
                const connectionToUse = this.free_connections.shift();
                this.all_connections[connectionToUse._id].inUse = true;
                return connectionToUse;
            }
            // if no available connections, make one
            else if (this.free_connections.length === 0) {
                const connectionToUse = yield this._createConnection();
                this.all_connections[connectionToUse._id].inUse = true;
                return connectionToUse;
            }
        });
    }
    releaseConnection(connection) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state !== Pool.STATE_RUNNING) {
                throw new Error(`cannot release connections to a pool that is not running, current state: ${this.state}`);
            }
            if (!this._connectionBelongs(connection)) {
                throw new Error("connection is not from this pool");
            }
            if (this.all_connections[connection._id].inUse === false) {
                throw new Error("cannot return a connection that has already been returned to the pool");
            }
            // if aged out connection is returned to the pool, close it
            if (this.all_connections[connection._id].ageStatus === true) {
                clearTimeout((_a = this.all_connections[connection._id].ageOutID) !== null && _a !== void 0 ? _a : undefined);
                delete this.all_connections[connection._id];
                try {
                    yield connection._defaultClose();
                }
                catch (e) {
                    // continue regardless of error
                }
                if (this.free_connections.length < this.config.minAvailable) {
                    let newConn = yield this._createConnection();
                    this.free_connections.push(newConn);
                }
                return;
            }
            // Determine if the connection has any problem to avoid keeping and returning a bad
            // connection to the pool
            const connectionAlive = yield this._checkConnection(connection); //returns boolean
            if (connectionAlive) {
                this.all_connections[connection._id].inUse = false;
                this.free_connections.push(connection);
            }
            else {
                yield this._closeConnection(connection._id);
            }
        });
    }
    closePool() {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = Pool.STATE_CLOSING;
            yield Promise.all(Object.keys(this.all_connections).map((key) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                try {
                    yield ((_a = this.all_connections[key].connection) === null || _a === void 0 ? void 0 : _a._defaultClose());
                    clearTimeout((_b = this.all_connections[key].ageOutID) !== null && _b !== void 0 ? _b : undefined);
                }
                catch (e) {
                    // continue regardless of error
                }
            })));
            this.all_connections = {};
            this.free_connections = [];
            if (this.config.checkTime != 0) {
                clearInterval(this.livelinessInterval);
            }
            this.state = Pool.STATE_CLOSED;
        });
    }
}
exports.default = Pool;
Pool.STATE_INITIALIZING = "initializing";
Pool.STATE_RUNNING = "running";
Pool.STATE_CLOSING = "closing";
Pool.STATE_CLOSED = "closed";
Pool.LIVELINESS_RUNNING = "liveliness running";
Pool.LIVELINESS_NOT_RUNNING = "liveliness not running";
//# sourceMappingURL=pool.js.map