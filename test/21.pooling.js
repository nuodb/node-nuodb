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

  before("open connection, init tables", async () => {
    pool = new Pool(poolArgs);
    await pool.init();
    pool.should.be.ok();
    pool.all_connections.length().should.equal(10);
  });

  after("close connection", async () => {
    await pool.closePool();
  });

  it("13.1 Can get results in chunks", async () => {
    //   let err = null;
    //   try {
    //     const results = await connection.execute(tableQuery);
    //     for(let i = 0; i < numRows; i+=getChunkSize){
    //       const rows = await results.getRows(getChunkSize);
    //       (rows.length).should.be.eql(getChunkSize);
    //       (rows[getChunkSize-1]['F1']).should.be.eql(i);
    //     }
    //   } catch (e) {
    //     err = e;
    //   }
    //   should.not.exist(err);
  });
});
