'use strict';

var nuodb = require('../');
var should = require('should');
var async = require('async');
var config = require('./config.js');

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

describe('4. calling execute', function () {
  describe('4.1 to run SQL DDL', function () {
    var connection = null;
    before(function (done) {
      nuodb.connect(config, function (err, conn) {
        should.not.exist(err);
        connection = conn;
        connection.execute(createTable, function (err, results) {
          should.not.exist(err);
          done();
          // console.log('dropped table');
          // connection.execute(createTable, function (err, results) {
          //   console.log('created table');
          //   should.not.exist(err);
          // });
        });


      });
    });
    /*
    after(function (done) {
      connection.execute('DROP TABLE IF EXISTS types;', function (err, results) {
        should.not.exist(err);
        done();
      });
    });
    */
    it('4.1.1 successfully inserts a record into tables using binds', function (done) {
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
        });
      });
      done();
    });
    /*
    it('4.1.1 runs simple dual queries', function (done) {
      connection.execute('select f1 from test where f0=?', [1], function (err, results) {
        should.not.exist(err);
        done();
        // should.not.exist(results);
      });
    });
    */
  });
});