// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
var config = require('./config.js');

describe('4. testing await', () => {

  var driver = null;

  before('create driver', function () {
    driver = new Driver();
  });

  it('4.1 open and close connections using async/await', async function () {
    try {
      var connection = await driver.connect(config);
      connection.should.be.ok();
      await connection.close();
      connection.should.be.ok();
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('4.2 can run the documentation async/await sample', function () {

    (async () => {
      var connection = await driver.connect(config);
      try {
        var results = await connection.execute('SELECT 1 AS VALUE FROM DUAL');
        var rows = await results.getRows();
        console.log(rows);
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        await connection.close();
      }
    })().catch(e => console.log(e.stack));
  });
});
