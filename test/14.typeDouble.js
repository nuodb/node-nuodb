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

describe('14. typeDouble.js', function () {

  var driver = null;
  var connection = null;
  var tableName = "type_double";

  // See: DOUBLE @ http://doc.nuodb.com/Latest/Content/SQL-Numeric-Types.htm
  var data = [
    0,
    -2.2250738585072014E-308,
    1.7976931348623157E+308,
    -1.7976931348623157E+308,
    2.2250738585072014E-308,
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

  describe('14.1 testing DOUBLE data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
        function (callback) {
          helper.createTable(connection, tableName, 'DOUBLE', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('14.1.1 result set stores DOUBLE correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(function (err, rows) {
          should.not.exist(err);
          should.exist(rows);
          console.log(rows);
          (rows).should.containEql({F1:0});
          (rows).should.containEql({F1:-2.2250738585072014E-308});
          (rows).should.containEql({F1:1.7976931348623157E+308});
          (rows).should.containEql({F1:-1.7976931348623157E+308});
          (rows).should.containEql({F1:2.2250738585072014E-308});
          results.close(function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

});
