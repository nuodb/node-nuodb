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

describe('5. calling execute', function () {
  describe('5.1 to run SQL query', function () {
    var connection = null;
    before(function (done) {
      nuodb.connect(config, function (err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
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
    it('5.1.1 successfully queries a record from dual', function (done) {
      connection.execute('SELECT 1 AS VALUE FROM DUAL;', [], function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(1, function (err, rows) {
          should.not.exist(err);
          console.log(rows);
          //   results.close(function (err) {
          //     should.not.exist(err);
          //     done();
        });
        done();
      });
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