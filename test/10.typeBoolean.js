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

describe('10. typeBoolean.js', function () {

  var driver = null;
  var connection = null;
  var tableName = "type_boolean";

  // See: BOOLEAN @ http://doc.nuodb.com/Latest/Content/SQL-Boolean-Types.htm
  var data = [
    0,
    1,
    false,
    true
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

  describe('10.1 testing BOOLEAN data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
        function (callback) {
          helper.createTable(connection, tableName, 'BOOLEAN', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('10.1.1 result set stores BOOLEAN correctly', function (done) {
      connection.execute("SELECT * FROM " + tableName, [], function (err, results) {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows(function (err, rows) {
          should.not.exist(err);
          should.exist(rows);
          console.log(rows);
          (rows.length).should.be.equal(4);
          (rows).should.containEql({F1: true});
          (rows).should.containEql({F1: false});
          results.close(function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

});
