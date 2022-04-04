// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

import Driver from "./driver";

class Pool {
  constructor(args) {
    this.config = {
      connection_limit: args.connection_limit,
      connection_config: args.connection_config,
      max_age: args.max_age,
      checkTime: args.checkTime, // how often to run the livliness check
      hardLimit: args.hardLimit,
    };

    this.all_connections = [];

    this.free_connections = [];

    this.ageTracker = {};

    this.this.state = "initializing";
    // may want to check state of this promise (not sure how)
    this._init = async function () {
      for (let i = 0; i < this.config.connection_limit; i++) {
        const newConn = await this._createConnection();
        this.free_connections.push(newConn);
      }
      this.state = "running";
    };
    this._init();
    this.livelinessID = setInterval(
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

  async _livelinessCheck() {
    const checked = {};
    let toCheck = this.free_connections[0];
    while (checked[toCheck.id] != true && this.free_connections.length() > 0) {
      const connectionAlive = await this._checkConnection(toCheck); //returns boolean
      if (connectionAlive) {
        this.free_connections.push(toCheck);
        toCheck = this.free_connections.shift();
      } else {
        // this wont work cause connection is not in free connecitons
        let newConn = await this._closeConnection(toCheck.id); // need to check if you actually get connection
        this.free_connections.push(newConn);
      }
    }
  }
  // may want better name for this function, closeConnection
  async _closeConnection(id) {
    // instead of iteration use reduce
    if (this.state == "closing" || this.state == "closed") {
      return;
    }
    for (let i = 0; i < this.free_connections.length(); i++) {
      if (this.free_connections[i].id === id) {
        this.free_connections.splice(i, 1);
        for (let j = 0; j < this.all_connections.length(); j++) {
          if (this.all_connections[j].id === id) {
            await this.all_connections[j].close();
            this.all_connections.splice(j, 1);
            this.ageTracker[id] = undefined;
            if (this.connection_limit > this.all_connections.length()) {
              newConn = await this._createConnection();
              this.free_connections.push(newConn);
              return newConn;
            } else {
              return;
            }
          }
        }
      }
    }
    this.ageTracker[id] = true;
    return;
  }

  async _createConnection() {
    if (this.config.hardLimit > 0) {
      if (this.all_connections.length() >= this.config.hardLimit) {
        throw "connection hard limit reached"; //not right?
      }
    }
    let connection;
    const driver = new Driver();
    try {
      // todo put this block into a new function _createConnection _ delineates functions NOT for users
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
    } catch (err) {
      // ! what to do here? retry, retry limit before giving up
      // throw errors
      return err;
    }
  }

  async requestConnection() {
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
  async releaseConnection(connection) {
    if (this.ageTracker[connection.id] === true) {
      for (let i = 0; i < this.all_connections.length(); i++) {
        if (this.all_connections[i].id === connection.id) {
          this.all_connections.splice(i, 1);
          this.ageTracker[connection.id] = undefined;
          await connection.close();
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
          await connection.close();
          return;
        }
      }
    }
    // connection is not aged out and connection limit not reached
    const connectionAlive = await this._checkConnection(connection); //returns boolean
    if (connectionAlive) {
      this.free_connections.push(connection);
    } else {
      const newConn = await this._closeConnection(connection.id);
      this.free_connections.push(newConn);
    }
  }

  async _closePool() {
    this.state = "closing";
    for (connection in this.all_connections) {
      await connection.close();
    }
    while (this.all_connections.length() > 0) {
      this.all_connections.pop();
    }
    while (this.free_connections.length() > 0) {
      this.free_connections.pop();
    }
    clearImmediate(this.livelinessID);
    this.state = "closed";
  }
}
export default Pool;

/* Failure handling is non-existent. Need a way to close the pool, close connections and end 
timers. possible add state variable init, running, closed.*/
