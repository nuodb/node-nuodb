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

describe("13. Test Result Set", () => {
  let pool = null;

  before("open pool", async () => {
    pool = new Pool(poolArgs);
    await pool.init();
    pool.should.be.ok();
    assert.equal(pool.all_connections.length(), 10);
  });

  after("close pool", async () => {
    await pool.closePool();
    assert.equal(pool.all_connections.length(), 0);
  });

  it("do nothing", () => {
    //
  });
});
