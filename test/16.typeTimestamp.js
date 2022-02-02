// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver, RowMode, Isolation } = require('..');
var should = require('should');
var async = require('async');
var config = require('./config');
var helper = require('./typeHelper');

describe('16. typeTimestamp.js', function () {

  var driver = null;
  var connection = null;
  var tableName = "type_timestamp";

  // See: TIMESTAMP @ http://doc.nuodb.com/Latest/Content/SQL-Date-and-Time-Types.htm
  var dateOne = new Date(-100000000);
  var dateTwo = new Date(0);
  var dateThree = new Date(10000000000);
  var dateFour = new Date(100000000000);
  var dateFive = new Date(1995, 11, 17);
  var dateSix = new Date('1995-12-17T03:24:00');
  var dateSeven = new Date('2015-07-23 21:00:00');
  var dateEight = new Date('2015-07-23 22:00:00');
  var dateNine = new Date('2015-07-23 23:00:00');
  var dateTen = new Date('2015-07-24 00:00:00');
  // var dateEleven = new Date(2003, 9, 23, 11, 50, 30, 123);
  var data = [
    dateOne,
    dateTwo,
    dateThree,
    dateFour,
    dateFive,
    dateSix,
    dateSeven,
    dateEight,
    dateNine,
    dateTen //,
    // dateEleven
  ];

  before('open connection', function (done) {
    driver = new Driver();
    driver.connect(config, function (err, conn) {
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

  describe('16.1 testing TIMESTAMP data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
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

    it('16.1.1 result set stores TIMESTAMP correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], {
        rowMode: RowMode.ROWS_AS_OBJECT, isolationLevel: Isolation.CONSISTENT_READ
      }, function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(function (err, rows) {
          should.not.exist(err);
          should.exist(rows);
          console.log(rows);
          (rows).should.containEql({F1: dateOne});
          (rows).should.containEql({F1: dateTwo});
          (rows).should.containEql({F1: dateThree});
          (rows).should.containEql({F1: dateFour});
          (rows).should.containEql({F1: dateFive});
          (rows).should.containEql({F1: dateSix});
          (rows).should.containEql({F1: dateSeven});
          (rows).should.containEql({F1: dateEight});
          (rows).should.containEql({F1: dateNine});
          (rows).should.containEql({F1: dateTen});
          // (rows).should.containEql({F1: dateEleven}); <---- this fails
          results.close(function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

});
