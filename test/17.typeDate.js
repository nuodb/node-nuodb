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

describe('17. typeDate.js', function () {

  var driver = null;
  var connection = null;
  var tableName = "type_date";

  // See: TIME @ http://doc.nuodb.com/Latest/Content/SQL-Date-and-Time-Types.htm
  // var dateOne = new Date(-100000000);
  var dateOne = '09/08/2013';
  // var dateTwo = new Date(0);
  var dateTwo = '9/8/2013';
  // var dateThree = new Date(10000000000);
  var dateThree = '2013-09-08';
  // var dateFour = new Date(100000000000);
  var dateFour = '2013.8.9';
  // var dateFive = new Date(1995, 11, 17);
  var dateFive = '8.9.13';
  // var dateSix = new Date('1995-12-17T03:24:00');
  var dateSix = 'September 8, 13';
  // var dateSeven = new Date('2015-07-23 21:00:00');
  var dateSeven = 'Sep 08 2013';
  // var dateEight = new Date('2015-07-23 22:00:00');
  var dateEight = 'September 08 2013';
  // var dateNine = new Date('2015-07-23 23:00:00');
  var dateNine = '08/Sep/2013';
  // var dateTen = new Date('2015-07-24 00:00:00');
  var dateTen = '8/Sept/13';
  // var dateEleven = new Date(2003, 9, 23, 11, 50, 30, 123);
  var dateEleven = '20130908';
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
    dateTen,
    dateEleven
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

  describe('17.1 testing DATE data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
        function (callback) {
          helper.createTable(connection, tableName, 'DATE', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('17.1.1 result set stores DATE correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(function (err, rows) {
          should.not.exist(err);
          should.exist(rows);
          console.log(rows);
          for (var date of rows){
            should.equal(date['F1'].getTime(), 1378598400000);
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
