'use strict';

var nuodb = require('../');
var should = require('should');
var async = require('async');
var config = require('./config.js');
var helper = require('./typeHelper.js');

describe('22. typeBigInt.js', function () {

  var connection = null;
  var tableName = "type_bigint";

  // See: BIGINT @ http://doc.nuodb.com/Latest/Content/SQL-Numeric-Types.htm
  var data = [
    0,
    9007199254740990,
    -9007199254740990,
    '-9223372036854775808',
    '9223372036854775807',
  ];

  before('open connection', function (done) {
    nuodb.connect(config, function (err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('close connection', function (done) {
    connection.close(function (err) {
      should.not.exist(err);
      done();
    });
  });

  describe('22.1 testing BIGINT data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.createTable(connection, tableName, 'BIGINT', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('22.1.1 result set stores BIGINT correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(6, function (err, rows) {
          should.not.exist(err);
          console.log(rows);
          // todo: figure out how to compare rows to input values
          results.close(function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

});