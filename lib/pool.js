// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

var Driver = require("./driver");

const REQUIRED_INITIAL_ARGUMENTS = [
  "connection_limit",
  "connection_config",
  "max_age",
  "checkTime",
  "hardLimit",
  "connection_retry_limit",
];

class Pool {
  static STATE_INITIALIZING = "initializing";
  static STATE_RUNNING = "running";
  static STATE_CLOSING = "closing";
  static STATE_CLOSED = "closed";
  static LIVELINESS_RUNNING = "liveliness running";
  static LIVELINESS_NOT_RUNNING = "liveliness not running";

  constructor(args) {
    // ! at the moment all args are required and there are no default values
    REQUIRED_INITIAL_ARGUMENTS.forEach((arg) => {
      if (!(arg in args)) {
        throw new Error(
          `cannot find required argument ${arg} in constructor arguments`
        );
      }
    });
    this.config = {
      connection_limit: args.connection_limit, //! minAvailable and initial size
      connection_config: args.connection_config,
      max_age: args.max_age, //! maxAge
      checkTime: args.checkTime, // how often to run the livliness check
      hardLimit: args.hardLimit, //! maxLimit
      connection_retry_limit: args.connection_retry_limit,
    };

    this.all_connections = {};

    this.free_connections = [];

    this.state = Pool.STATE_INITIALIZING;

    this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;

    this.livelinessInterval = setInterval(
      () => this._livelinessCheck(),
      this.config.checkTime
    );
  }
  //! user calling init is not ideal
  async init() {
    for (let i = 0; i < this.config.connection_limit; i++) {
      const newConn = await this._createConnection();
      this.free_connections.push(newConn);
    }
    this.state = Pool.STATE_RUNNING;
  }

  _connectionBelongs(connection) {
    if (this.all_connections[connection.id] === undefined) {
      return false;
    }
    if (this.all_connections[connection.id].connection === undefined) {
      return false;
    }
    return connection === this.all_connections[connection.id].connection;
  }

  async _checkConnection(connection) {
    try {
      await connection.execute("SELECT 1 AS VALUE FROM DUAL");
    } catch (e) {
      return false;
    }
    return true;
  }
  //! THIS NEED TO BE FIXED !!!!!!!!
  async _livelinessCheck() {
    if (this.livelinessStatus === Pool.LIVELINESS_RUNNING) {
      return;
    }
    if (this.free_connections.length === 0) {
      return;
    }
    this.livelinessStatus = Pool.LIVELINESS_RUNNING;
    const checked = {};
    //! take this out of free before checking!!!!
    // let toCheck = this.free_connections[0];
    while (this.free_connections.length > 0) {
      let toCheck = this.free_connections.shift();
      this.all_connections[toCheck.id].inUse = true;
      if (checked[toCheck.id] === true) {
        return;
      }
      // ! all we need to do is take out the conn and put it back, it is checked upon return
      checked[toCheck.id] = true;
      this.releaseConnection(toCheck);
    }
    this.livelinessStatus = Pool.LIVELINESS_NOT_RUNNING;
  }

  _checkFreeAndRemove(id) {
    for (let i = 0; i < this.free_connections.length; i++) {
      if (this.free_connections[i].id === id) {
        this.free_connections.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  async _checkAllAndRemove(id) {
    try {
      await this.all_connections[id].connection.close();
    } catch (e) {
      // continue regardless of error
    }
    clearTimeout(this.all_connections[id].ageOutID);
    delete this.all_connections[id];
  }

  async _populationCheck() {
    if (
      this.config.connection_limit > Object.keys(this.all_connections).length
    ) {
      let newConn = await this._createConnection();
      this.free_connections.push(newConn);
      return;
    } else {
      return;
    }
  }

  async _closeConnection(id) {
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      return;
    }

    if (this.all_connections[id].inUse) {
      this.all_connections[id].ageStatus = true;
      return;
    }
    // const isFree = this._checkFreeAndRemove(id);
    // if (!isFree) {
    //   this.all_connections[id].ageStatus = true;
    //   return;
    // }
    this._checkFreeAndRemove(id);

    await this._checkAllAndRemove(id);

    await this._populationCheck();

    return;
  }

  // ! Do we always need to make a new Driver?
  async _makeConnection() {
    const driver = new Driver();
    let connection = await driver.connect(this.config.connection_config);
    let id = 0;
    while (this.all_connections[id] != undefined) {
      id++;
    }
    connection.id = id;
    this.all_connections[id] = {
      connection: connection,
      ageStatus: false,
      ageOutID: null,
      inUse: false,
    };

    this.all_connections[id].ageOutID = setTimeout(
      () => this._closeConnection(id),
      this.config.max_age,
      id
    );
    return connection;
  }

  async _createConnection() {
    if (this.config.hardLimit > 0) {
      if (Object.keys(this.all_connections).length >= this.config.hardLimit) {
        throw new Error("connection hard limit reached"); // needs to be error object
      }
    }

    let error;
    let connectionMade;
    let tries = 0;
    const maxTries = this.config.connection_retry_limit;
    while (tries < maxTries && connectionMade === undefined) {
      try {
        connectionMade = await this._makeConnection();
      } catch (err) {
        tries++;
        error = err;
      }
    }
    if (tries >= maxTries) {
      throw error;
    }
    return connectionMade;
  }

  async requestConnection() {
    if (this.state === Pool.STATE_INITIALIZING) {
      throw new Error(
        "must initialize the pool before requesting a connection"
      );
    }
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      throw new Error("the pool is closing or closed");
    }
    if (this.config.hardLimit > 0) {
      if (
        Object.keys(this.all_connections).length >= this.config.hardLimit &&
        this.free_connections.length === 0
      ) {
        throw new Error("connection hard limit reached");
      }
    }
    // if free_connection length > 0 use free connection
    if (this.free_connections.length > 0) {
      const connectionToUse = this.free_connections.shift();
      this.all_connections[connectionToUse.id].inUse = true;
      return connectionToUse;
    }
    // if free_connection length = 0 and max connections > all connections make a new connection and add to all_connections
    else if (this.free_connections.length === 0) {
      const connectionToUse = await this._createConnection();
      this.all_connections[connectionToUse.id].inUse = true;
      return connectionToUse;
    }
  }

  // todo modularize
  async releaseConnection(connection) {
    if (this.state !== Pool.STATE_RUNNING) {
      throw new Error(
        `cannot release connections to a pool that is not running, current state: ${this.state}`
      );
    }
    if (!this._connectionBelongs(connection)) {
      throw new Error("connection is not from this pool");
    }
    if (this.all_connections[connection.id].inUse === false) {
      throw new Error(
        "cannot return a connection that has already been returned to the pool"
      );
    }
    if (this.all_connections[connection.id].ageStatus === true) {
      clearTimeout(this.all_connections[connection.id].ageOutID);
      delete this.all_connections[connection.id];
      try {
        await connection.close();
      } catch (e) {
        // continue regardless of error
      }
      if (
        // ! changed from all to free
        this.free_connections.length < this.config.connection_limit
      ) {
        let newConn = await this._createConnection();
        this.free_connections.push(newConn);
      }
      return;
    }
    if (
      //! changed from all to free
      this.free_connections.length >= this.config.connection_limit
    ) {
      clearTimeout(this.all_connections[connection.id].ageOutID);
      delete this.all_connections[connection.id];
      try {
        await connection.close();
      } catch (e) {
        // continue regardless of error
      }
      return;
    }
    // connection is not aged out and connection limit not reached
    const connectionAlive = await this._checkConnection(connection); //returns boolean
    if (connectionAlive) {
      this.all_connections[connection.id].inUse = false;
      this.free_connections.push(connection);
    } else {
      await this._closeConnection(connection.id);
    }
  }

  async closePool() {
    this.state = Pool.STATE_CLOSING;
    await Promise.all(
      Object.keys(this.all_connections).map(async (key) => {
        try {
          await this.all_connections[key].connection.close();
          clearTimeout(this.all_connections[key].ageOutID);
        } catch (e) {
          // continue regardless of error
        }
      })
    );
    this.all_connections = {};
    this.free_connections = [];
    clearInterval(this.livelinessInterval);
    this.state = Pool.STATE_CLOSED;
  }
}

//! current implementation of connection_limit is too hastey to close connections,
//! look into maintaining free_connections equal to connection_limit

module.exports = Pool;
