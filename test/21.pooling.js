// Copyright (c) 2018-2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

const { Pool } = require("..");
var should = require("should");
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({parseValues:true}).env({parseValues:true}).file({ file: args.config||'test/config.json' });

var DBConnect = nconf.get('DBConnect');


const poolArgs = {
  minAvailable: 10,
  connectionConfig: DBConnect,
  maxAge: 2000,
  checkTime: 10000,
  maxLimit: 12,
  connectionRetryLimit: 5,
  connectionReset: true,
};

const connectionDoesntBelong = {
  I: "don't belong",
};

const badPoolArgs = {
  wrong: "this is not how it is done",
};

describe("21. test pooling", function () {
  this.timeout(500000);
  let pool = null;
  let connections = null;

  before("open pool", () => {
    pool = new Pool(poolArgs);
  });

  it("21.1 does not allow users to request connections before initializing the pool", async () => {
    await pool
      .requestConnection()
      .should.be.rejectedWith(
        "must initialize the pool before requesting a connection"
      );
  });

  it("21.2 should reject pool creation with missing arguments", () => {
    (() => {
      const wrong = new Pool(badPoolArgs);
      return wrong;
    }).should.throw(
      "cannot find required argument connectionConfig in constructor arguments"
    );
  });

  it("21.3 Pool can open", async () => {
    await pool.init();
    pool.should.be.ok();
    should.equal(
      pool.free_connections.length,
      10,
      "pool should have 10 connections"
    );
    should.equal(pool.state, "running", "pool should be running after init");
  });

  it("21.4 Allows user to request and return connections", async () => {
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
      "pool should return to 10 free connections once connection is released"
    );
  });

  it("21.5 Check that Connecitons are reset", async () => {
    for (let i = 0; i < pool.free_connections.length; i++) {
      let connection = await pool.requestConnection();
      connection.autoCommit = false;
      await pool.releaseConnection(connection);
    }
    let connection1 = await pool.requestConnection();
    should.equal(
      connection1.autoCommit,
      true,
      "connection is supposed to be true"
    );
    await pool.releaseConnection(connection1);
  });

  it("21.6 Allows users to request over soft limit of connections", async () => {
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
      11,
      "pool should remain with 10 free connections when none are in use"
    );
  });

  it("21.7 does not drop below soft limit of connections", async () => {
    await pool._closeConnection(pool.free_connections[0]._id);

    should.equal(
      Object.keys(pool.all_connections).length,
      10,
      "pool should maintain an open a connection when closing to below soft limit"
    );
  });

  it("21.8 Does not close a connection in use on age out", async () => {
    let curr = await pool.requestConnection();
    await pool._closeConnection(curr._id);
    should.equal(
      pool.all_connections[curr._id].ageStatus,
      true,
      "connection should age out but not close"
    );
    await pool.releaseConnection(curr);
  });

  it("21.9 Does not allow the pool to exceed the hard limit of connections", async () => {
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

  it("21.10 rejects connections that do not belong to the pool", async () => {
    await pool
      .releaseConnection(connectionDoesntBelong)
      .should.be.rejectedWith("connection is not from this pool");
  });

  it("21.11 does not allow release of connections that are not in use/have already been released", async () => {
    const connection = await pool.requestConnection();
    await pool.releaseConnection(connection);
    await pool
      .releaseConnection(connection)
      .should.be.rejectedWith(
        "cannot return a connection that has already been returned to the pool"
      );
  });

  it("21.12 Has changed the connection.close method to return the connection to the pool", async () => {
    const connection = await pool.requestConnection();
    should.equal(
      pool.free_connections.length,
      11,
      "pool should have 11 connections"
    );
    await connection.close();
    should.equal(
      pool.free_connections.length,
      12,
      "calling close on the connection should return it to the pool"
    );
  });

  it("21.13 Pool can close", async () => {
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
