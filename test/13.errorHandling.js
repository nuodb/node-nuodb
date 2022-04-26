// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { Driver } = require('..');

const should = require('should');
const config = require('./config');
const async = require('async');


describe('13. Test Connection to multiple TEs', () => {

  let driver = null;
  let conn = null

  before('open connection, init tables', async () => {
    driver = new Driver();

    conn = await driver.connect(config);

    conn.should.be.ok();

    let err = null;

    try {
      // create the tables
      await conn.execute('CREATE TABLE IF NOT EXISTS T1 (F1 int)');
      await conn.execute('CREATE TABLE IF NOT EXISTS T2 (F1 int)');

      // insert data into the tables
      await conn.execute('INSERT INTO T1 VALUES (1)');
      await conn.execute('INSERT INTO T2 VALUES (1)');

      const results = await conn.execute('select * from T1');
      const rows = await results.getRows();
      await results.close();
      (rows.length).should.not.be.eql(0);
    } catch (e) {
      err = e
    }
    should.not.exist(err)
  });

  after('close connection, delete tables', async () => {
    let err = null;

    try {
      // clean up tables
      //await conn.execute('DROP TABLE IF EXISTS T1');
      //await conn.execute('DROP TABLE IF EXISTS T2');

      // close connections
      await conn.close();
    } catch (e) {
      err = e
    }
    should.not.exist(err)
  });
//*
  it('13.1 Can detect deadlock', async () => {
    // open up two connections with autocommit off
    const c1 = await driver.connect(config);
    const c2 = await driver.connect(config);

    c1.autoCommit = false;
    c2.autoCommit = false;
   
    c1.should.be.ok();
    c2.should.be.ok();

    // acquire locks
    await c1.execute('select * from T1 for update');
    await c2.execute('select * from T2 for update');

    // now produce a deadlock condition
    let err = null;
    try {
      await c1.execute('update T2 set F1=F1+1');
      await c2.execute('update T1 set F1=F1+1');
    }  catch (e) {
      err = e;
      console.error(e);
    }
    c1.commit();
    c2.commit();
    should.exist(err);

    // close the connections
    await c1.close();
    await c2.close();
    
  });
  /**/
});
