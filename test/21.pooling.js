// Copyright (c) 2018-2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

const { Pool } = require("..");
var should = require("should");
var config = require("./config");

const poolArgs = {
  minAvailable: 10,
  connectionConfig: config,
  maxAge: 2000,
  checkTime: 10000,
  maxLimit: 12,
  connectionRetryLimit: 5,
};

const connectionDoesntBelong = {
  I: "don't belong",
};

const badPoolArgs = {
  wrong: "this is not how it is done",
};

describe("14 test pooling", () => {
  let pool = null;
  let connections = null;

  before("open pool", () => {
    pool = new Pool(poolArgs);
  });

  it("14.1 does not allow users to request connections before initializing the pool", async () => {
    await pool
      .requestConnection()
      .should.be.rejectedWith(
        "must initialize the pool before requesting a connection"
      );
  });

  it("14.2 should reject pool creation with missing arguments", () => {
    (() => {
      const wrong = new Pool(badPoolArgs);
      return wrong;
    }).should.throw(
      "cannot find required argument connectionConfig in constructor arguments"
    );
  });

  it("14.3 Pool can open", async () => {
    await pool.init();
    pool.should.be.ok();
    should.equal(
      pool.free_connections.length,
      10,
      "pool should have 10 connections"
    );
    should.equal(pool.state, "running", "pool should be running after init");
  });

  it("14.4 Allows user to request and return connections", async () => {
    let connection = await pool.requestConnection();
    connection.should.be.ok();
    should.equal(
      pool.free_connections.length,
      9,
      "pool should still have the remaining 9 free connections"
    );
    await pool.releaseConnection(connection);
    should.equal(
      pool.free_connections.length,
      10,
      "pool shoul return to 10 free connections once connection is released"
    );
  });

  it("14.5 Allows users to request over soft limit of connections and closes excess connections upon return", async () => {
    connections = [];
    for (let i = 0; i < 11; i++) {
      connections.push(await pool.requestConnection());
    }
    should.equal(
      Object.keys(pool.all_connections).length,
      11,
      "pool should allow user to go up to 11 connections"
    );

    for (let i = 0; i < connections.length; i++) {
      await pool.releaseConnection(connections[i]);
    }
    should.equal(
      pool.free_connections.length,
      10,
      "pool should remain with 10 free connections when none are in use"
    );
  });

  it("14.6 does not drop below soft limit of connections", async () => {
    await pool._closeConnection(pool.free_connections[0]._id);

    should.equal(
      Object.keys(pool.all_connections).length,
      10,
      "pool should maintain an open a connection when closing to below soft limit"
    );
  });

  it("14.7 Does not close a connection in use on age out", async () => {
    let curr = await pool.requestConnection();
    await pool._closeConnection(curr._id);
    should.equal(
      pool.all_connections[curr._id].ageStatus,
      true,
      "connection should age out but not close"
    );
    await pool.releaseConnection(curr);
  });

  it("14.8 Does not allow the pool to exceed the hard limit of connections", async () => {
    connections = [];
    for (let i = 0; i < 12; i++) {
      connections.push(await pool.requestConnection());
    }

    await pool
      .requestConnection()
      .should.be.rejectedWith("connection hard limit reached");

    for (let i = 0; i < connections.length; i++) {
      await pool.releaseConnection(connections[i]);
    }
  });

  it("14.9 rejects connections that do not belong to the pool", async () => {
    await pool
      .releaseConnection(connectionDoesntBelong)
      .should.be.rejectedWith("connection is not from this pool");
  });

  it("14.10 does not allow release of connections that are not in use/have already been released", async () => {
    const connection = await pool.requestConnection();
    await pool.releaseConnection(connection);
    await pool
      .releaseConnection(connection)
      .should.be.rejectedWith(
        "cannot return a connection that has already been returned to the pool"
      );
  });

  it("14.11 Has changed the connection.close method to return the connection to the pool", async () => {
    const connection = await pool.requestConnection();
    should.equal(
      pool.free_connections.length,
      9,
      "pool should have 9 connections"
    );
    await connection.close();
    should.equal(
      pool.free_connections.length,
      10,
      "calling close on the connection should return it to the pool"
    );
  });

  it("14.12 Pool can close", async () => {
    await pool.closePool();
    should.equal(
      pool.free_connections.length,
      0,
      "pool should have no connections"
    );
  });

  after("close pool", async () => {
    await pool.closePool();
    should.equal(
      pool.free_connections.length,
      0,
      "pool should have no connections"
    );
  });
});
