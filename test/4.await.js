// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({parseValues:true}).env({parseValues:true}).file({ file: args.config||'test/config.json' });

var DBConnect = nconf.get('DBConnect');


describe('4. testing await', () => {

  var driver = null;

  before('create driver', function () {
    driver = new Driver();
  });

  it('4.1 open and close connections using async/await', async function () {
    try {
      var connection = await driver.connect(DBConnect);
      connection.should.be.ok();
      await connection.close();
      connection.should.be.ok();
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('4.2 can run the documentation async/await sample', function () {

    (async () => {
      var connection = await driver.connect(DBConnect);
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
