// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

var Driver = require("./driver");
//todo make these static pool variables
const state_initializing = "initializing";
const state_running = "running";
const state_closing = "closing";
const state_closed = "closed";
const liveliness_running = "liveliness running";
const liveliness_not_running = "liveliness not running";

class Pool {
  constructor(args) {
    // todo put in default values, are these required? need conditional access and specific error
    this.config = {
      connection_limit: args.connection_limit,
      connection_config: args.connection_config,
      max_age: args.max_age,
      checkTime: args.checkTime, // how often to run the livliness check
      hardLimit: args.hardLimit,
      connection_retry_limit: args.connection_retry_limit,
    };

    this.all_connections = {};

    this.free_connections = [];

    this.state = state_initializing;

    this.livelinessStatus = liveliness_not_running;

    this.livelinessInterval = setInterval(
      this._livelinessCheck,
      this.config.checkTime
    );
  }

  async init() {
    for (let i = 0; i < this.config.connection_limit; i++) {
      const newConn = await this._createConnection();
      this.free_connections.push(newConn);
    }
    this.state = state_running;
  }

  _connectionBelongs(connection) {
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
  // what if free_connections is empty at beginning, what if we get unitialized values
  async _livelinessCheck() {
    if (this.livelinessStatus === liveliness_running) {
      return;
    }
    this.livelinessStatus = liveliness_running;
    const checked = {};
    let toCheck = this.free_connections[0];
    while (
      this.free_connections.length > 0 &&
      checked[toCheck.id] != true &&
      toCheck != undefined
    ) {
      checked[toCheck.id] = true;
      const connectionAlive = await this._checkConnection(toCheck); //returns boolean
      if (connectionAlive) {
        this.free_connections.push(toCheck);
        toCheck = this.free_connections.shift();
      } else {
        await this._closeConnection(toCheck.id);
        toCheck = this.free_connections.shift();
      }
    }
    //! needed?
    if (toCheck) {
      this.free_connections.push(toCheck);
    }
    this.livelinessStatus = liveliness_not_running;
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
    delete this.all_connections[id];
    // this.all_connections[id] = undefined;
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
    if (this.state === state_closing || this.state === state_closed) {
      return;
    }
    const isFree = this._checkFreeAndRemove(id);
    if (!isFree) {
      this.all_connections[id].ageStatus = true;
      return;
    }
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
    };
    // this.all_connections[id]["connection"] = connection;
    // this.all_connections[id]["ageStatus"] = false;
    // connection.id = id;
    // this.all_connections[id].connection = connection;
    this.all_connections[id].ageOutID = setTimeout(
      this._closeConnection,
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
    if (this.state === state_initializing) {
      throw new Error("pool is initializing");
    }
    if (this.state === state_closing || this.state === state_closed) {
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
      let connectionToUse = this.free_connections.shift();
      return connectionToUse;
    }
    // if free_connection length = 0 and max connections > all connections make a new connection and add to all_connections
    else if (this.free_connections.length === 0) {
      return await this._createConnection();
    }
  }

  // could add method to connection that targets a pool, or just have reference to pool
  // todo modularize
  async releaseConnection(connection) {
    if (!this._connectionBelongs(connection)) {
      throw new Error("connection is not from this pool");
    }
    if (this.state === state_closing || this.state === state_closed) {
      throw new Error("connection is closing or closed");
    }
    if (this.all_connections[connection.id].ageStatus === true) {
      delete this.all_connections[connection.id];
      // this.all_connections[connection.id] = undefined;
      try {
        await connection.close();
      } catch (e) {
        // continue regardless of error
      }
      if (
        Object.keys(this.all_connections).length < this.config.connection_limit
      ) {
        let newConn = await this._createConnection();
        this.free_connections.push(newConn);
      }
      return;
    }
    if (
      Object.keys(this.all_connections).length > this.config.connection_limit
    ) {
      delete this.all_connections[connection.id];
      // this.all_connections[connection.id] = undefined;
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
      this.free_connections.push(connection);
    } else {
      await this._closeConnection(connection.id);
    }
  }

  async closePool() {
    this.state = state_closing;
    await Promise.all(
      Object.keys(this.all_connections).map(async (key) => {
        try {
          await this.all_connections[key].connection.close();
          clearTimeout(this.all_connections[id].ageOutID);
        } catch (e) {
          // continue regardless of error
        }
      })
    );
    this.all_connections = {};
    this.free_connections = [];
    clearInterval(this.livelinessInterval);
    this.state = state_closed;
  }
}

// todo ageOut setTimeout memory leak can be cleaned up by adding key to the connection id in all_connections

module.exports = Pool;
