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
  checkTime: 5000,
  hardLimit: 50,
  connection_retry_limit: 5,
};

describe("13. test pooling", () => {
  let pool = null;
  let connections = null;

  before("open pool", () => {
    pool = new Pool(poolArgs);
  });

  it("Pool can open", async () => {
    await pool.init();
    pool.should.be.ok();
    should.equal(
      pool.free_connections.length,
      10,
      "pool should have 10 connections"
    );
    should.equal(pool.state, "running", "pool should be running after init");
  });

  it("Allows user to request and return connections", async () => {
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

  it("Allows users to request over soft limit of connections and closes excess connections upon return", async () => {
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
    should.equal(
      Object.keys(pool.all_connections).length,
      10,
      "pool should return to soft limit connections when excess is returned"
    );
  });

  it("Pool can close", async () => {
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
