// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');
var should = require('should');
var async = require('async');
var config = require('./config');
var helper = require('./typeHelper');

describe('18. typeTime.js', function () {

  var driver = null;
  var connection = null;
  var tableName = "type_time";

  // See: TIME @ http://doc.nuodb.com/Latest/Content/SQL-Date-and-Time-Types.htm
  // var dateOne = new Date(-100000000);
  var dateOne = '23:11:00.000000';
  // var dateTwo = new Date(0);
  var dateTwo = '23:11:00';
  // var dateThree = new Date(10000000000);
  // var dateFour = new Date(100000000000);
  var dateFour = '11:11 PM';
  // var dateFive = new Date(1995, 11, 17);
  // var dateSix = new Date('1995-12-17T03:24:00');
  // var dateSeven = new Date('2015-07-23 21:00:00');
  // var dateEight = new Date('2015-07-23 22:00:00');
  // var dateNine = new Date('2015-07-23 23:00:00');
  // var dateTen = new Date('2015-07-24 00:00:00');
  // var dateEleven = new Date(2003, 9, 23, 11, 50, 30, 123);
  var data = [
    dateOne,
    dateTwo,
    // dateThree,
    dateFour //,
    // dateFive,
    // dateSix,
    // dateSeven,
    // dateEight,
    // dateNine,
    // dateTen,
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

  describe('18.1 testing TIME data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
        function (callback) {
          helper.createTable(connection, tableName, 'TIME', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('18.1.1 result set stores TIME correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(function (err, rows) {
          should.not.exist(err);
          should.exist(rows);
          console.log(rows);
          for (var time of rows){
            should.equal(time["F1"].toLocaleTimeString(), '11:11:00 PM')
          }
          results.close(function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

});
