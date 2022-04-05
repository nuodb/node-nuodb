// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

import Driver from "./driver";
const state_intializing = "intializing";
const state_running = "running";
const state_closing = "closing";
const state_closed = "closed";
class Pool {
  constructor(args) {
    // todo put in default values
    this.config = {
      connection_limit: args.connection_limit,
      connection_config: args.connection_config,
      max_age: args.max_age,
      checkTime: args.checkTime, // how often to run the livliness check
      hardLimit: args.hardLimit,
      connection_retry_limit: args.connection_retry_limit,
    };

    this.all_connections = [];

    this.free_connections = [];

    this.ageTracker = {};

    this.state = state_intializing;
    // may want to check state of this promise (not sure how)
    // promise all this
    this._init = async function () {
      for (let i = 0; i < this.config.connection_limit; i++) {
        const newConn = await this._createConnection();
        this.free_connections.push(newConn);
      }
      this.state = state_running;
    };
    this._init();
    this.livelinessInterval = setInterval(
      this._livelinessCheck,
      this.config.checkTime
    );
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
    const checked = {};
    let toCheck = this.free_connections[0];
    while (
      this.free_connections.length() > 0 &&
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
    if (toCheck) {
      this.free_connections.push(toCheck);
    }
  }

  _checkFreeAndRemove(id) {
    for (let i = 0; i < this.free_connections.length(); i++) {
      if (this.free_connections[i].id === id) {
        this.free_connections.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  // ! could be obj, dont want to iterate, close could error
  async _checkAllAndRemove(id) {
    for (let j = 0; j < this.all_connections.length(); j++) {
      if (this.all_connections[j].id === id) {
        try {
          await this.all_connections[j].close();
        } catch (e) {}
        this.all_connections.splice(j, 1);
        this.ageTracker[id] = undefined;
      }
    }
  }

  async _populationCheck() {
    if (this.connection_limit > this.all_connections.length()) {
      newConn = await this._createConnection();
      this.free_connections.push(newConn);
      return newConn;
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
      this.ageTracker[id] = true;
      return;
    }
    await _checkAllAndRemove(id);

    return _populationCheck();
  }

  // ? do connections already have IDs? Do we always need to make a new Driver?
  async _makeConnection() {
    const driver = new Driver();
    connection = await driver.connect(this.config.connection_config);
    let id = 0;
    while (this.ageTracker[id] != undefined) {
      id++;
    }
    this.ageTracker[id] = false;
    connection.id = id;
    this.all_connections.push(connection);
    setTimeout(this._closeConnection, this.config.max_age, id);
    return connection;
  }

  async _createConnection() {
    if (this.config.hardLimit > 0) {
      if (this.all_connections.length() >= this.config.hardLimit) {
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
    if (this.state === state_closing || this.state === state_closed) {
      throw new Error("the pool is closing or closed");
    }
    if (this.config.hardLimit > 0) {
      if (
        this.all_connections.length() >= this.config.hardLimit &&
        this.free_connections.length === 0
      ) {
        throw new Error("connection hard limit reached"); // needs to be error object
      }
    }
    // if free_connection length > 0 use free connection
    if (this.free_connections.length() > 0) {
      let connectionToUse = this.free_connections.shift();
      return connectionToUse;
    }
    // if free_connection length = 0 and max connections > all connections make a new connection and add to all_connections
    else if (this.free_connections.length() === 0) {
      return await this._createConnection();
    }
  }

  // could add method to connection that targets a pool, or just have reference to pool
  // todo modularize
  async releaseConnection(connection) {
    if (this.state === state_closing || this.state === state_closed) {
      throw new Error("connection is closing or closed");
    }
    if (this.ageTracker[connection.id] === true) {
      for (let i = 0; i < this.all_connections.length(); i++) {
        if (this.all_connections[i].id === connection.id) {
          this.all_connections.splice(i, 1);
          this.ageTracker[connection.id] = undefined;
          try {
            await connection.close();
          } catch (e) {}
          if (this.all_connections.length() < this.config.connection_limit) {
            newConn = await this._createConnection();
            this.free_connections.push(newConn);
          }
          return;
        }
      }
    }
    if (this.all_connections.length() > this.config.connection_limit) {
      for (let i = 0; i < this.all_connections.length(); i++) {
        if (this.all_connections[i].id === connection.id) {
          this.all_connections.splice(i, 1);
          try {
            await connection.close();
          } catch (e) {}
          return;
        }
      }
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
      this.all_connections.map(async (connection) => {
        try {
          await connection.close();
        } catch (e) {}
      })
    );
    this.all_connections = [];
    this.free_connections = [];
    clearInterval(this.livelinessInterval);
    this.state = state_closed;
  }
}
export default Pool;

//todo look into _createConnection to seperate and make clearer
