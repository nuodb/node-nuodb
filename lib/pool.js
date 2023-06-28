// Copyright (c) 2018-2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

const logger = require('./logger');

var Driver = require("./driver");

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
	let err = new Error(`cannot find required argument ${arg} in constructor arguments`);
	logger.error(err);
	throw err;
      }
    });
    this.config = {
      minAvailable: args.minAvailable || 10,
      connectionConfig: args.connectionConfig,
      maxAge: args.maxAge || 300000,
      checkTime: args.checkTime ?? 120000, // how often to run the livliness check, will not run when set to 0
      maxLimit: args.maxLimit ?? 200,
      connectionRetryLimit: args.connectionRetryLimit || 5,
      skipCheckLivelinessOnRelease : args.skipCheckLivelinessOnRelease ?? false,
      livelinessCheck: args.livelinessCheck ?? 'query'
    };
    this.poolId = args.id || new Date().getTime();

    this.all_connections = {};

    this.free_connections = [];

    this.state = Pool.STATE_INITIALIZING;

    this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;

    //start liveliness check
    if (this.config.checkTime != 0) {
      this.livelinessInterval = setInterval(
        () => this._livelinessCheck(),
        this.config.checkTime
      );
    }
  }
  // populate the pool and prepare for use
  async init() {
    for (let i = 0; i < this.config.minAvailable; i++) {
      logger.trace(`Pool Init: createConnection`);
      const newConn = await this._createConnection();
      this.free_connections.push(newConn);
    }
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
    let retvalue = true;
    if (this.config.skipCheckLivelinessOnRelease === false) {
      if (connection.hasFailed() === false) {
        if (this.config.livelinessCheck.toLowerCase() === 'query') {
          try {
            const result = await connection.execute("SELECT 1 AS VALUE FROM DUAL");
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
    return retvalue;
  }
  //connection will be checked when releaseConnection is called on it.
  async _livelinessCheck() {
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
        await this.releaseConnection(toCheck);
        return;
      }
      checked[toCheck._id] = true;
      await this.releaseConnection(toCheck);
    }
    this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
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

  async _checkAllAndRemove(_id) {
    try {
      await this.all_connections[_id].connection._defaultClose();
    } catch (err) {
      logger.error(err,`id: ${id} connection: ${this.all_connections[_id].connection}`);
      throw err;
    }
    clearTimeout(this.all_connections[_id].ageOutID);
    delete this.all_connections[_id];
  }

  async _populationCheck() {
    // create a connection if we are not at maximum and we do not have a minimum amount of free connections
    if (Object.keys(this.all_connections).length < this.config.maxLimit &&
       this.free_connections.length < this.config.minAvailable 
    ) {
      logger.trace(`populationCheck: createConnection`);
      let newConn = await this._createConnection();
      this.free_connections.push(newConn);
      return;
    } else {
      return;
    }
  }

  async _closeConnection(_id) {
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      return;
    }
    //if connection is inUse mark it for closure upon return to free_connections
    if (this.all_connections[_id].inUse) {
      this.all_connections[_id].ageStatus = true;
      return;
    }

    this._checkFreeAndRemove(_id);

    await this._checkAllAndRemove(_id);

    await this._populationCheck();

    return;
  }

  async _makeConnection() {
    const driver = new Driver();
    let connection = await driver.connect(this.config.connectionConfig);
    const results = await connection.execute(
      "SELECT GETCONNECTIONID() FROM DUAL"
    );
    const connId = await results.getRows();
    connection.id = connId[0]["[GETCONNECTIONID]"];
    const thisPool = this;
    connection._defaultClose = connection.close;
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
      () => this._closeConnection(_id),
      this.config.maxAge,
      _id
    );
    return connection;
  }

  async _createConnection() {
    let error;
    let connectionMade;
    let tries = 0;
    const maxTries = this.config.connectionRetryLimit;
    while (tries < maxTries && connectionMade === undefined) {
      try {
        connectionMade = await this._makeConnection();
      } catch (err) {
        tries++;
        error = err;
      }
    }
    if (tries >= maxTries) {
      logger.error(error,'createConnection');
      throw error;
    }
    logger.trace(connectionMade, `createConnection`);
    return connectionMade;
  }

  async requestConnection() {
    if (this.state === Pool.STATE_INITIALIZING) {
      let err =new Error("must initialize the pool before requesting a connection");
      logger.error(err);
      throw err;
    }
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      let err = new Error("the pool is closing or closed");
      logger.error(err);
      throw err;
    }
    logger.info(`requestConnection: pool: ${this.poolId} free.length: ${this.free_connections.length} all_connections.length: ${Object.keys(this.all_connections).length}`);
    // if there is a free connection, use it
    if (this.free_connections.length > 0) {
      const connectionToUse = this.free_connections.shift();
      this.all_connections[connectionToUse._id].inUse = true;
      return connectionToUse;
    // if there are no free connection and we are not at maxLimit then create a connection
    } else if (Object.keys(this.all_connections).length < this.config.maxLimit) {
      logger.trace(`requestConnection: createConnection`);
      const connectionToUse = await this._createConnection();
      this.all_connections[connectionToUse._id].inUse = true;
      return connectionToUse;
    // there is no free connection, but maxLimit has been reached
    } else {
      let err = new Error("connection hard limit reached");
      logger.error(err);
      throw err;
    }
  }

  async releaseConnection(connection) {
    logger.trace(connection,`Enter releaseConnection`);
    let cid = connection.id;
    if (this.state !== Pool.STATE_RUNNING) {
      let err = new Error(`cannot release connections to a pool that is not running, current state: ${this.state}`);
      logger.error(err,`connection: ${connection}`);
      throw err;
    }
    if (!this._connectionBelongs(connection)) {
      let err = new Error('connection is not from this pool');
      logger.error(err);
      throw err;
    }
    if (this.all_connections[connection._id].inUse === false) {
      let err = new Error("cannot return a connection that has already been returned to the pool");
      logger.error(err,`connection: ${connection}`);
      throw err;
    }
    // if aged out connection is returned to the pool, close it
    if (this.all_connections[connection._id].ageStatus === true) {
      clearTimeout(this.all_connections[connection._id].ageOutID);
      delete this.all_connections[connection._id];
      try {
        await connection._defaultClose();
      } catch (err) {
        logger.error(err,'connection: ${connection} Closing Aged Connection upon Pool return');
        throw err;
      }
      // after aging out the released connection, backfill a replacement connection when appropriate
      if (Object.keys(this.all_connections).length < this.config.maxLimit &&
         this.free_connections.length < this.config.minAvailable 
      ) {
	logger.trace(`releaseConnection: ${connection} createConnection`);
        let newConn = await this._createConnection();
        this.free_connections.push(newConn);
      } else {
	logger.trace(`releaseConnection: ${connection} all_connection.length: ${Object.keys(this.all_connections).length} free_connections.length: ${this.free_connections.length}`);
      }

      logger.trace(`Exit releaseConnection ${cid}`);
      return;
    }
    // If the connection has not aged out, determine if the connection has any problem
    // close any bad connection and avoid returning a bad connection to the pool
    // all connections that are still useable can be returned to the pool
    const connectionAlive = await this._checkConnection(connection); //returns boolean
    if (connectionAlive) {
      this.all_connections[connection._id].inUse = false;
      this.free_connections.push(connection);
    } else {
      await this._closeConnection(connection._id);
    }
  }

  async closePool() {
    this.state = Pool.STATE_CLOSING;
    await Promise.all(
      Object.keys(this.all_connections).map(async (key) => {
        try {
          await this.all_connections[key].connection._defaultClose();
          clearTimeout(this.all_connections[key].ageOutID);
        } catch (err) {
          logger.error(err,'Close Pool');
          throw err;
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
