// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { Driver } = require('..');

var should = require('should');
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({parseValues:true}).env({parseValues:true}).file({ file: args.config||'test/config.json' });

var DBConnect = nconf.get('DBConnect');


const sleep = (ms) => new Promise((res) => {
  setTimeout(() => res(),ms)
} );

const msleepQuery = "select msleep(?) from dual";

describe('8. testing query timeout', () => {

  let driver = new Driver();
  let connection = null;

  before('create driver', async () => {
    connection = await driver.connect(DBConnect);
  });

  after('close connection', async () => {
    await connection.close();
  });

  it('8.1 Query should timeout when expected', async () => {
    let e = null;
    try {
      const result = await connection.execute(msleepQuery, [1000], {queryTimeout:1});
      result.should.be.ok();
      // ensure that we are actually waiting for the results
      const row = await result.getRows();
      row.should.be.ok();
    } catch (err) {
      e = err
    }
    should.exist(e);
  });

  it('8.2 Query should not timeout when not expected', async () => {
    let e = null;
    try {
      const result = await connection.execute(msleepQuery, [1], {queryTimeout:1000});
      result.should.be.ok();
      // ensure that we are actually waiting for the results
      const row = await result.getRows();
      row.should.be.ok();
    } catch (err) {
      e = err
    }
    should.not.exist(e);
  });

  it('8.3 No query timeout on app layer wait', async () => {
    let e = null;
    let result = null;
    try {
      result = await connection.execute(msleepQuery, [1000], {queryTimeout: 3000});
      result.should.be.ok();
      // sleep 4 seconds to ensure that the app layer is sleeping longer than the query would take to timeout
      await sleep(4000);
      // ensure that we are actually waiting for the results
      const row = await result.getRows();
      row.should.be.ok();
    } catch (err) {
      e = err
    }
    should.not.exist(e);
  });

});
