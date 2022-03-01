// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
var config = require('./config.js');

describe('8. testing query timeout', () => {

  let driver = new Driver();
  let connection = null;

  before('create driver', async () => {
    connection = await driver.connect(config);
  });

  after('close connection', async () => {
    await connection.close();
  });

  it('8.1 Query should timeout when expected', async () => {
    let e = null;
    try {
      const result = await connection.execute("select msleep(10000) from dual", {queryTimeout: 1});
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
      const result = await connection.execute("select msleep(1) from dual", {queryTimeout:10000});
      result.should.be.ok();
      // ensure that we are actually waiting for the results
      const row = await result.getRows();
      row.should.be.ok();
    } catch (err) {
      e = err
    }
    should.not.exist(e);
  });

});
