// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

const Pool = require("../lib/pool.js");
var should = require("should");
var config = require("./config");

const poolArgs = {
  connection_limit: 10,
  connection_config: config,
  max_age: 10000,
  checkTime: 50000,
  hardLimit: 12,
  connection_retry_limit: 5,
};

describe("14. test pooling", () => {
  let pool = null;
  let connections = null;

  before("open pool", () => {
    pool = new Pool(poolArgs);
  });

  it("14.1 Pool can open", async () => {
    await pool.init();
    pool.should.be.ok();
    should.equal(
      pool.free_connections.length,
      10,
      "pool should have 10 connections"
    );
    should.equal(pool.state, "running", "pool should be running after init");
  });

  it("14.2 Allows user to request and return connections", async () => {
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

  it("14.3 Allows users to request over soft limit of connections and closes excess connections upon return", async () => {
    connections = [];
    for (let i = 0; i < 11; i++) {
      connections.push(await pool.requestConnection());
    }
    should.equal(
      Object.keys(pool.all_connections).length,
      11,
      "pool should allow user to go up to 11 connections"
    );
    await pool.releaseConnection(connections[0]);
    connections.shift();
    should.equal(
      Object.keys(pool.all_connections).length,
      10,
      "pool should return to soft limit connections when excess is returned"
    );
  });

  it("14.4 does not drop below soft limit of connections", async () => {
    await Promise.all(
      Object.keys(connections).map(async (connection) => {
        try {
          await connection.releaseConnection(connection);
        } catch (e) {
          // continue regardless of error
        }
      })
    );
    await pool._closeConnection(connections[0].id);
    should.equal(
      Object.keys(pool.all_connections).length,
      10,
      "pool should maintain re-open a connection when closing to below soft limit"
    );
    should.equal(
      pool.free_connections.length,
      10,
      "pool should remain with 10 free connections when none are in use"
    );
  });

  it("14.5 Does not close a connection in use on age out", async () => {
    let curr = await pool.requestConnection();
    await pool._closeConnection(curr.id);
    should.equal(
      pool.all_connections[curr.id].ageStatus,
      true,
      "connection should age out but not close"
    );
    await pool.releaseConnection(curr);
  });

  it("14.6 Does not allow the pool to exceed the hard limit of connections", async () => {
    connections = [];
    for (let i = 0; i < 10; i++) {
      connections.push(await pool.requestConnection());
    }
  });

  it("14.7 Pool can close", async () => {
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
