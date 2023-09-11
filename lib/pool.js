// Copyright (c) 2018-2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

const logger = require("./logger");

let Driver = require("./driver");

const REQUIRED_INITIAL_ARGUMENTS = ["connectionConfig"];

class Pool {
  static STATE_INITIALIZING = "initializing";
  static STATE_RUNNING = "running";
  static STATE_CLOSING = "closing";
  static STATE_CLOSED = "closed";
  static LIVELINESS_RUNNING = "liveliness running";
  static LIVELINESS_NOT_RUNNING = "liveliness not running";

  constructor(args) {
    REQUIRED_INITIAL_ARGUMENTS.forEach((arg) => {
      if (!(arg in args)) {
        let err = new Error(
          `cannot find required argument ${arg} in constructor arguments`
        );
        logger.error(err);
        throw err;
      }
    });

    this.counters = {
      makeCall: 0,
      makeExit: 0,
      createCall: 0,
      createExit: 0,
      defaultCall: 0,
      defaultExit: 0,
      closeCall: 0,
      closeExit: 0,
      releaseCall: 0,
      releaseExit: 0,
      releaseReplaced: 0,
      releaseAged: 0,
      releasePushAlive: 0,
      releaseCloseDead: 0,
      requestCall: 0,
      requestExit: 0,
      createRequest: 0,
      freeRequest: 0,
      closeInUse: 0,
      closeNotInUse: 0,
      checkFreeCall: 0,
      checkFreeExit: 0,
      checkAllCall: 0,
      checkAllExit: 0,
      populateCall: 0,
      populateExit: 0,
      populatePush: 0,
      liveCall: 0,
      liveExit: 0,
      checkCall: 0,
      checkExit: 0,
      setTimeout: 0,
    };

    //    this.sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

    this.config = {
      minAvailable: args.minAvailable || 10,
      connectionConfig: args.connectionConfig,
      maxAge: args.maxAge || 300000,
      checkTime: args.checkTime ?? 120000, // how often to run the livliness check, will not run when set to 0
      maxLimit: args.maxLimit ?? 200,
      connectionRetryLimit: args.connectionRetryLimit || 5,
      skipCheckLivelinessOnRelease: args.skipCheckLivelinessOnRelease ?? false,
      livelinessCheck: args.livelinessCheck ?? "query",
    };
    this.poolId = args.id || new Date().getTime();

    this.all_connections = {};

    this.free_connections = [];

    this.state = Pool.STATE_INITIALIZING;

    this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;

    const thisPool = this;
    //start liveliness check
    if (this.config.checkTime != 0) {
      this.livelinessInterval = setInterval(
        () => thisPool._livelinessCheck(),
        thisPool.config.checkTime
      );
    }
  }
  // populate the pool and prepare for use
  async init() {
    for (let i = 0; i < this.config.minAvailable; i++) {
      const newConn = await this._createConnection();
      this.free_connections.push(newConn);
    }
    logger.warn(`init: pool: ${this.poolId} ${JSON.stringify(this.config)}`);
    this.state = Pool.STATE_RUNNING;
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
  async _checkConnection(connection) {
    this.counters.checkCall += 1;
    let retvalue = true;
    if (this.config.skipCheckLivelinessOnRelease === false) {
      if (connection.hasFailed() === false) {
        if (this.config.livelinessCheck.toLowerCase() === "query") {
          try {
            const result = await connection.execute(
              "SELECT 1 AS VALUE FROM DUAL"
            );
            await result.close();
          } catch (err) {
            logger.error(err);
            retvalue = false;
          }
        }
      } else {
        retvalue = false;
      }
    }
    // if we get here it means either we want all connections put back in the pool or any of liveliness check
    // performed, either a connection check or a full query all passed
    this.counters.checkExit += 1;
    return retvalue;
  }
  //connection will be checked when releaseConnection is called on it.
  async _livelinessCheck() {
    this.counters.liveCall += 1;
    if (this.livelinessStatus === Pool.LIVELINESS_RUNNING) {
      return;
    }
    if (this.free_connections.length === 0) {
      return;
    }
    this.livelinessStatus = Pool.LIVELINESS_RUNNING;
    const checked = {};
    while (this.free_connections.length > 0) {
      if (checked[this.free_connections[0]._id] === true) {
        break;
      } else {
        let toCheck = this.free_connections.shift();
        this.all_connections[toCheck._id].inUse = true;
        checked[toCheck._id] = true;
        await this.releaseConnection(toCheck);
      }
    }
    this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
    this.counters.liveExit += 1;
    return;
  }

  _checkFreeAndRemove(_id) {
    this.counters.checkFreeCall += 1;
    let removed = false;
    try {
      for (let i = 0; i < this.free_connections.length; i++) {
        if (this.free_connections[i]._id === _id) {
          this.free_connections.splice(i, 1);
          removed = true;
          break;
        }
      }
    } catch (err) {
      logger.error(err, `id: ${_id} connection: ${this.all_connections[_id].connection}`);
      throw err;
    }
    this.counters.checkFreeExit += 1;
    return removed;
  }

  async _checkAllAndRemove(_id) {
    this.counters.checkAllCall += 1;
    try {
      await clearTimeout(this.all_connections[_id].ageOutID);
      await this.all_connections[_id].connection._defaultClose();
      delete this.all_connections[_id];
    } catch (err) {
      logger.error(
        err,
        `id: ${_id} connection: ${this.all_connections[_id].connection}`
      );
      throw err;
    }
    this.counters.checkAllExit += 1;
  }

  async _populationCheck() {
    this.counters.populateCall += 1;
    // create a connection if we are not at maximum and we do not have a minimum amount of free connections
    if (
      Object.keys(this.all_connections).length < this.config.maxLimit &&
      this.free_connections.length < this.config.minAvailable
    ) {
      this.counters.populatePush += 1;
      let newConn = await this._createConnection();
      this.free_connections.push(newConn);
    }
    this.counters.populateExit += 1;
  }

  async _closeConnection(_id) {
    this.counters.closeCall += 1;
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      return;
    }
    //if connection is inUse mark it for closure upon return to free_connections
    if (this.all_connections[_id].inUse) {
      this.counters.closeInUse += 1;
      logger.info(`Closing ${_id} In Use`);
      this.all_connections[_id].ageStatus = true;
    } else {
      this.counters.closeNotInUse += 1;
      this._checkFreeAndRemove(_id);
      await this._checkAllAndRemove(_id);
      await this._populationCheck();
    }

    this.counters.closeExit += 1;
  }

  async _makeConnection() {
    this.counters.makeCall += 1;
    if (
      Object.keys(this.all_connections).length > this.config.maxLimit ||
      this.counters.closeCall != this.counters.closeExit
    ) {
      logger.level = "info";
    }
    logger.info(`makeConnection: pool: ${this.poolId} ${JSON.stringify(this.counters)} free.length: ${this.free_connections.length} all_connections.length ${Object.keys(this.all_connections).length}`);
    const driver = new Driver();
    let connection = await driver.connect(this.config.connectionConfig);
    const results = await connection.execute(
      "SELECT GETCONNECTIONID() FROM DUAL"
    );
    const connId = await results.getRows();
    connection.id = connId[0]["[GETCONNECTIONID]"];
    const thisPool = this;
    // Every connection object has a default close function that calls the
    // The underlying actual NuoDB Conneciton close function.
    // This replaces the connection function pointer to go through a wrapper
    // that is used to gather any stats about closing, then it invokes the
    // the original close function that was associated with the conneciton instance
    // The orginal function is stored in case the connection prototype that
    // that establishes the original call is ever modified.
    //    connection._defaultClose = connection.close;
    connection._defaultOrigClose = connection.close;
    connection._defaultClose = async () => {
      thisPool.counters.defaultCall += 1;
      try {
        await connection._defaultOrigClose();
      } catch (err) {
        logger.error(err);
        if (err != "Error: failed to close connection [connection closed]") {
          throw err;
        }
      }
      thisPool.counters.defaultExit += 1;
    };
    connection.close = async () => {
      await thisPool.releaseConnection(connection);
    };
    let _id = 0;
    while (this.all_connections[_id] != undefined) {
      _id++;
    }
    connection._id = _id;
    this.all_connections[_id] = {
      connection: connection,
      ageStatus: false,
      ageOutID: null,
      inUse: false,
    };

    this.all_connections[_id].ageOutID = setTimeout(
      (_id) => {
        thisPool.counters.setTimeout += 1;
        thisPool._closeConnection(_id)
      },
      this.config.maxAge,
      _id
    );
    this.counters.makeExit += 1;
    return connection;
  }

  async _createConnection() {
    this.counters.createCall += 1;
    let error;
    let connectionMade;
    let tries = 0;
    const maxTries = this.config.connectionRetryLimit;
    while (tries < maxTries && connectionMade === undefined) {
      try {
        connectionMade = await this._makeConnection();
      } catch (err) {
        logger.error(err, "createConnection");
        tries++;
        error = err;
      }
    }
    if (tries >= maxTries) {
      logger.error(error, "createRetry");
      throw error;
    }
    this.counters.createExit += 1;
    return connectionMade;
  }

  async requestConnection() {
    this.counters.requestCall += 1;
    if (
      Object.keys(this.all_connections).length > this.config.maxLimit ||
      this.counters.closeCall != this.counters.closeExit
    ) {
      logger.level = "info";
    }
    logger.info(`requestConnection: pool: ${this.poolId} ${JSON.stringify(this.counters)} free.length: ${this.free_connections.length} all_connections.length ${Object.keys(this.all_connections).length}`);
    if (this.state === Pool.STATE_INITIALIZING) {
      let err = new Error(
        "must initialize the pool before requesting a connection"
      );
      logger.error(err);
      throw err;
    }
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      let err = new Error("the pool is closing or closed");
      logger.error(err);
      throw err;
    }

    let connectionToUse = null;
    // if there is a free connection, use it
    if (this.free_connections.length > 0) {
      this.counters.freeRequest += 1;
      connectionToUse = this.free_connections.shift();
      this.all_connections[connectionToUse._id].inUse = true;
      // if there are no free connection and we are not at maxLimit then create a connection
    } else if (Object.keys(this.all_connections).length < this.config.maxLimit) {
      this.counters.createRequest += 1;
      connectionToUse = await this._createConnection();
      this.all_connections[connectionToUse._id].inUse = true;
      // there is no free connection, but maxLimit has been reached
    } else {
      let err = new Error("connection hard limit reached");
      logger.error(err);
      throw err;
    }
    this.counters.requestExit += 1;
    return connectionToUse;
  }

  async releaseConnection(connection) {
    this.counters.releaseCall += 1;
    if (this.state !== Pool.STATE_RUNNING) {
      let err = new Error(
        `cannot release connections to a pool that is not running, current state: ${this.state}`
      );
      logger.error(err, `connection: ${connection}`);
      throw err;
    }
    if (!this._connectionBelongs(connection)) {
      let err = new Error("connection is not from this pool");
      logger.error(err);
      throw err;
    }
    if (this.all_connections[connection._id].inUse === false) {
      let err = new Error(
        "cannot return a connection that has already been returned to the pool"
      );
      logger.error(err, `connection: ${connection}`);
      throw err;
    }
    // if aged out connection is returned to the pool, close it
    if (this.all_connections[connection._id].ageStatus === true) {
      this.counters.releaseAged += 1;
      try {
        await clearTimeout(this.all_connections[connection._id].ageOutID);
        await connection._defaultClose();
        delete this.all_connections[connection._id];
      } catch (err) {
        logger.error(
          err,
          "connection: ${connection} Closing Aged Connection upon Pool return"
        );
        throw err;
      }
      // after aging out the released connection, backfill a replacement connection when appropriate
      if (
        Object.keys(this.all_connections).length < this.config.maxLimit &&
        this.free_connections.length < this.config.minAvailable
      ) {
        this.counters.releaseReplaced += 1;
        let newConn = await this._createConnection();
        this.free_connections.push(newConn);
      }
    } else {
      // If the connection has not aged out, determine if the connection has any problem
      // close any bad connection and avoid returning a bad connection to the pool
      // all connections that are still useable can be returned to the pool
      const connectionAlive = await this._checkConnection(connection); //returns boolean
      if (connectionAlive) {
        this.counters.releasePushAlive += 1;
        this.all_connections[connection._id].inUse = false;
        this.free_connections.push(connection);
      } else {
        this.counters.releaseCloseDead += 1;
        await this._closeConnection(connection._id);
      }
    }
    this.counters.releaseExit += 1;
    return;
  }

  async closePool() {
    this.state = Pool.STATE_CLOSING;
    const thisPool = this;
    await Promise.all(
      Object.keys(this.all_connections).map(async (key) => {
        try {
          await clearTimeout(thisPool.all_connections[key].ageOutID);
          await thisPool.all_connections[key].connection._defaultClose();
          delete thisPool.all_connections[key];
        } catch (err) {
          logger.error(err, "Close Pool");
          if (err != "Error: failed to close connection [connection closed]") {
            throw err;
          }
        }
      })
    );
    this.all_connections = {};
    this.free_connections = [];
    if (this.config.checkTime != 0) {
      clearInterval(this.livelinessInterval);
    }
    this.state = Pool.STATE_CLOSED;
  }
}

module.exports = Pool;
