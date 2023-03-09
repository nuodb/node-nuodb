// Copyright (c) 2018-2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

import Connection from "./connection.mjs";
import { Configuration } from "./driver.mjs";
import Driver from "./driver.mjs";

const REQUIRED_INITIAL_ARGUMENTS = ["connectionConfig"];

export interface PoolConfiguration {
  minAvailable: number,
  connectionConfig: Configuration,
  maxAge: number,
  checkTime: number,
  maxLimit: number,
  connectionRetryLimit: number,
  skipCheckLivelinessOnRelease?: boolean,
  livelinessCheck?: 'query'|string
};

interface AllConnections {
  [connection: string]: {
    connection?: Connection,
    inUse: boolean,
    ageOutID: null|NodeJS.Timeout,//undefined|null|number,
    ageStatus: boolean
  }
};

type FreeConnections = Connection[];

export default class Pool {
  static STATE_INITIALIZING = "initializing";
  static STATE_RUNNING = "running";
  static STATE_CLOSING = "closing";
  static STATE_CLOSED = "closed";
  static LIVELINESS_RUNNING = "liveliness running";
  static LIVELINESS_NOT_RUNNING = "liveliness not running";
  
  public config: PoolConfiguration;
  public all_connections: AllConnections;
  public free_connections: FreeConnections;
  public state: string;
  public livelinessStatus: string;
  public livelinessInterval: undefined|NodeJS.Timer = undefined; //!



  constructor(args: PoolConfiguration) {
    REQUIRED_INITIAL_ARGUMENTS.forEach((arg) => {
      if (!(arg in args)) {
        throw new Error(
          `cannot find required argument ${arg} in constructor arguments`
        );
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
    // below not to be in use
    // this.poolId = args.id || new Date().getTime();

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
      const newConn = await this._createConnection();
      this.free_connections.push(newConn);
    }
    this.state = Pool.STATE_RUNNING;
  }
  //verify that connection belongs in this pool
  _connectionBelongs(connection: Connection): boolean {
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
  async _checkConnection(connection: Connection): Promise<null|boolean> {
    let retvalue = true;
    if (this.config.skipCheckLivelinessOnRelease === false) {
      if (connection.hasFailed() === false) {
        if (this.config.livelinessCheck?.toLowerCase() === 'query') {
          try {
            const result = await connection.execute("SELECT 1 AS VALUE FROM DUAL");
            await result!.close();
          } catch (e) {
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
    const checked: {[_id: number]: true} = {};
    while (this.free_connections.length > 0) {
      let toCheck = this.free_connections.shift() as Connection;
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

  _checkFreeAndRemove(_id: number) {
    for (let i = 0; i < this.free_connections.length; i++) {
      if (this.free_connections[i]._id === _id) {
        this.free_connections.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  async _checkAllAndRemove(_id: number) {
    try {
      await this.all_connections[_id].connection?._defaultClose();
    } catch (e) {
      // continue regardless of error
    }
    clearTimeout(this.all_connections[_id].ageOutID ?? undefined);
    delete this.all_connections[_id];
  }

  async _populationCheck() {
    if (this.config.minAvailable > Object.keys(this.all_connections).length) {
      let newConn = await this._createConnection();
      this.free_connections.push(newConn);
      return;
    } else {
      return;
    }
  }

  async _closeConnection(_id: number) {
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
    let connection = await driver.connect(this.config.connectionConfig) as Connection;
    const results = await connection.execute(
      "SELECT GETCONNECTIONID() FROM DUAL"
    );
    const connId = await results!.getRows();

    Object.defineProperty(connection, 'id', {
      value: connId[0]["[GETCONNECTIONID]"]
    })
    const thisPool = this;
    connection._defaultClose = connection.close;
    connection.close = async () => {
      await thisPool.releaseConnection(connection);
    };
    let _id = 0;
    while (this.all_connections[_id] != undefined) {
      _id++;
    }
    // Object.defineProperty(connection, "_id",  {
    //   value: _id
    // })

    connection._id = _id

    this.all_connections[_id] = {
      connection: connection,
      ageStatus: false,
      ageOutID: null,
      inUse: false,
    };

    this.all_connections[_id].ageOutID = setTimeout(
      () => this._closeConnection(_id),
      this.config.maxAge,
      //@ts-ignore`//!!!
      _id
    );
    return connection;
  }

  async _createConnection(): Promise<Connection> {
    let error: unknown;
    let connectionMade: Connection|undefined;
    let tries = 0;
    const maxTries = this.config.connectionRetryLimit;
    while (tries < maxTries && connectionMade === undefined) {
      try {
        connectionMade = await this._makeConnection() as Connection;
      } catch (err: unknown) {
        tries++;
        error = err;
      }
    }
    if (tries >= maxTries) {
      throw error;
    }
    return connectionMade as Connection;
  }

  // async requestConnection(): Promise<Pick<Connection, "close"|"commit"|"execute"|"rollback">|undefined>;  // overload added to represent the publicly accessible Connection that only exposes these methods
  async requestConnection(): Promise<Connection|undefined> {
    if (this.state === Pool.STATE_INITIALIZING) {
      throw new Error(
        "must initialize the pool before requesting a connection"
      );
    }
    if (this.state === Pool.STATE_CLOSING || this.state === Pool.STATE_CLOSED) {
      throw new Error("the pool is closing or closed");
    }
    if (this.config.maxLimit > 0) {
      if (
        Object.keys(this.all_connections).length >= this.config.maxLimit &&
        this.free_connections.length === 0
      ) {
        throw new Error("connection hard limit reached");
      }
    }
    // if a connection is available, use free connection
    if (this.free_connections.length > 0) {
      const connectionToUse = this.free_connections.shift();
      this.all_connections[connectionToUse!._id].inUse = true;
      return connectionToUse;
    }
    // if no available connections, make one
    else if (this.free_connections.length === 0) {
      const connectionToUse = await this._createConnection();
      this.all_connections[connectionToUse._id].inUse = true;
      return connectionToUse;
    }
  }

  async releaseConnection(connection: Partial<Connection>): Promise<void>;  // As the connection publicly exposed is only partially available, this prevent any problems with such connection in TypeScript
  async releaseConnection(connection: Connection): Promise<void> {
    if (this.state !== Pool.STATE_RUNNING) {
      throw new Error(
        `cannot release connections to a pool that is not running, current state: ${this.state}`
      );
    }
    if (!this._connectionBelongs(connection)) {
      throw new Error("connection is not from this pool");
    }
    if (this.all_connections[connection._id].inUse === false) {
      throw new Error(
        "cannot return a connection that has already been returned to the pool"
      );
    }
    // if aged out connection is returned to the pool, close it
    if (this.all_connections[connection._id].ageStatus === true) {
      clearTimeout(this.all_connections[connection._id].ageOutID ?? undefined);
      delete this.all_connections[connection._id];
      try {
        await connection._defaultClose();
      } catch (e) {
        // continue regardless of error
      }
      if (this.free_connections.length < this.config.minAvailable) {
        let newConn = await this._createConnection();
        this.free_connections.push(newConn);
      }
      return;
    }
    // Determine if the connection has any problem to avoid keeping and returning a bad
    // connection to the pool
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
          await this.all_connections[key].connection?._defaultClose();
          clearTimeout(this.all_connections[key].ageOutID ?? undefined);
        } catch (e) {
          // continue regardless of error
        }
      })
    );
    this.all_connections = {};
    this.free_connections = [];
    if (this.config.checkTime != 0) {
      clearInterval(this.livelinessInterval!);
    }
    this.state = Pool.STATE_CLOSED;
  }
}

