// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

import { Driver } from '../dist/index.js';
import should from 'should';
import config from './config.js';

var createTable = 'CREATE TABLE IF NOT EXISTS types \
  (\
    f1 STRING,\
    f2 TEXT,\
    f3 CHAR,\
    f4 SMALLINT,\
    f5 INTEGER,\
    f6 BIGINT,\
    f7 BOOLEAN,\
    f8 TIMESTAMP\
  );';
var dropTable = 'DROP TABLE IF EXISTS types;';
var insertScript = 'INSERT INTO types\
  (f1, f2, f3, f4, f5, f6, f7, f8) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

describe('5. calling execute ', function () {

  var driver = null;

  before('create driver', function () {
    driver = new Driver();
  });

  describe('5.1 to create, insert into, and delete tables', function () {
    var connection = null;
    before(function (done) {
      driver.connect(config, function (err, conn) {
        should.not.exist(err);
        connection = conn;
        connection.execute(createTable, function (err, results) {
          should.not.exist(err);
          should.not.exist(results);
          done();
        });
      });
    });

    after(function (done) {
      connection.execute(dropTable, function (err, results) {
        should.not.exist(err);
        should.not.exist(results);
        done();
      });
    });

    it('5.1.1 successfully inserts a record into tables using binds', function (done) {
      // MAX_SAFE_INT == 9007199254740991
      // BigInt == 9223372036854775807
      var tests = [
        {
          binds: [null, null, null, null, null, null, null, new Date('1995-12-17T03:24:00')]
        },
        {
          // this is February!!!
          binds: ['string', 'text', 'a', 0, 0, 0, false, new Date(98, 1)]
        },
        {
          binds: ['string', 'text', 'b', -32768, -2147483648, -9007199254740991, true, new Date(1995, 11, 17, 3, 24, 0)]
        },
        {
          binds: ['string', 'text', 'c', 32767, 2147483647, 9007199254740991, true, '2008-09-15']
        }
      ];
      tests.forEach(function (test) {
        connection.execute(insertScript, test.binds, function (err, results) {
          should.not.exist(err);
          should.not.exist(results);
        });
      });
      done();
    });
  });
});