// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";
const {
  Driver
} = require("..");
const should = require("should");
const args = require('yargs').argv;
var nconf = require('nconf');

// Setup order for test parameters and default configuration file
nconf.argv({
  parseValues: true
}).env({
  parseValues: true
}).file({
  file: args.config || 'test/config.json'
});

var DBConnect = nconf.get('DBConnect');

describe("16. SQLException", function() {
  // The length of time of the tests to complete has been uneven
  // This has been changed to use a 0 timeout, so no timeout, but
  // but obviously this would be bad in the event of true hang,
  // the test suite would get stuck.
  this.timeout(0);
  let driver = null;
  let conn = null;

  before("open connection, init tables", async () => {
    // await netHostUp();
    driver = new Driver();

    //conn = await driver.connect(config.DBConnect);
    conn = await driver.connect(DBConnect);

    conn.should.be.ok();

    let err = null;

    try {
      await conn.execute("DROP TABLE IF EXISTS T1");
      await conn.execute("DROP TABLE IF EXISTS T2");

      await conn.execute("DROP INDEX UNIQUENESS_INDEX IF EXISTS");
      await conn.execute("DROP TABLE IF EXISTS T3");

      // create the tables
      await conn.execute("CREATE TABLE IF NOT EXISTS T1 (F1 int)");
      await conn.execute("CREATE TABLE IF NOT EXISTS T2 (F1 int)");

      await conn.execute("CREATE TABLE IF NOT EXISTS T3 (F1 int)");
      await conn.execute("CREATE UNIQUE INDEX UNIQUENESS_INDEX ON T3(F1)");

      // insert data into the tables
      await conn.execute("INSERT INTO T1 VALUES (1)");
      await conn.execute("INSERT INTO T2 VALUES (1)");

      const results = await conn.execute("select * from T1");
      const rows = await results.getRows();
      await results.close();
      rows.length.should.not.be.eql(0);
    } catch (e) {
      err = e;
      console.log(e);
    }
    should.not.exist(err);
  });

  after("close connection, delete tables", async () => {
    let err = null;

    try {
      // clean up tables
      await conn.execute("DROP TABLE IF EXISTS T1");
      await conn.execute("DROP TABLE IF EXISTS T2");

      await conn.execute("DROP INDEX UNIQUENESS_INDEX IF EXISTS");
      await conn.execute("DROP TABLE IF EXISTS T3");

      // close connections
      await conn.close();
    } catch (e) {
      err = e;
      console.log(e);
    }
    should.not.exist(err);
  });

  it("16.1 Can detect deadlock", async () => {
    // open up two connections with autocommit off
    const c1 = await driver.connect(DBConnect);
    const c2 = await driver.connect(DBConnect);

    c1.should.be.ok();

    const update_lock = true;
    const post_commit = true;

    c1.autoCommit = false;
    c2.autoCommit = false;
    // await c1.execute("set autocommit off");
    // await c2.execute("set autocommit off");

    if (update_lock) {
      await c1.execute("update T1 set F1=F1+1");
      await c2.execute("update T2 set F1=F1+1");
    }

    // now produce a deadlock condition
    let err = null;
    try {
      await Promise.all([
        c1.execute("update T2 set F1=F1+1"),
        c2.execute("update T1 set F1=F1+1"),
      ]);
    } catch (e) {
      err = e;
      console.log(e);
    }

    if (post_commit) {
      await c1.commit();
      await c2.commit();
    }

    should.exist(err);
    (err.message.includes('transaction deadlock')).should.be.true();

    // close the connections
    await c1.close();
    await c2.close();
  });

  it("16.2 Can detect an index uniqueness error", async () => {
    let err = null;
    try {
      await conn.execute("INSERT INTO T3 VALUES (1)");
      await conn.execute("INSERT INTO T3 VALUES (1)");
    } catch (e) {
      err = e;
      console.log(e);
    }
    should.exist(err);
    (err.message.includes('duplicate value in unique index')).should.be.true();
  });

});
