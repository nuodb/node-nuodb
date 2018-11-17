'use strict';

var nuodb = require('../');
var should = require('should');
var async = require('async');
var config = require('./config.js');
var helper = require('./typeHelper.js');

describe('26. typeTimestamp.js', function () {

  var connection = null;
  var tableName = "type_timestamp";

  // See: TIMESTAMP @ http://doc.nuodb.com/Latest/Content/SQL-Date-and-Time-Types.htm
  var data = [
    new Date(-100000000),
    new Date(0),
    new Date(10000000000),
    new Date(100000000000),
    new Date(1995, 11, 17),
    new Date('1995-12-17T03:24:00'),
    new Date('2015-07-23 21:00:00'),
    new Date('2015-07-23 22:00:00'),
    new Date('2015-07-23 23:00:00'),
    new Date('2015-07-24 00:00:00'),
    new Date(2003, 9, 23, 11, 50, 30, 123)
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

  describe('26.1 testing TIMESTAMP data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.createTable(connection, tableName, 'TIMESTAMP', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('26.1.1 result set stores TIMESTAMP correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], {rowMode: nuodb.ROWS_AS_OBJECT}, function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        console.log(results.rows);
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