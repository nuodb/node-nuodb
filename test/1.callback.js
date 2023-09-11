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

describe('1. testing callback', () => {

  var driver = null;

  before('create driver', function () {
    driver = new Driver();
  });

  it('1.1 open and close connections using callbacks', function (done) {
    driver.connect(DBConnect, (err, conn) => {
      should.not.exist(err);
      const connection = conn;
      connection.should.be.ok();
      connection.close((err) => {
        should.not.exist(err);
        done();
      })
      connection.should.be.ok();
    })
  });

  it('1.2 can run the sample', function (done) {
    driver.connect(DBConnect, (err, conn) => {
      should.not.exist(err);
      const connection = conn;
      connection.should.be.ok();
      connection.execute('SELECT 1 AS VALUE FROM DUAL', (err, results) => {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows((err,rows) => {
          should.not.exist(err);
          rows.should.be.ok();
          connection.close((err) => {
            should.not.exist(err);
            done();
          })
        });
      });
    })
  });
});
