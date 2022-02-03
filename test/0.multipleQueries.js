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
  var tableName = "mq";

  // See: DOUBLE @ http://doc.nuodb.com/Latest/Content/SQL-Numeric-Types.htm
  var data = [
    0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
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

  describe('testing multiple queries of data', function () {
    before('create table', function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
        function (callback) {
          helper.createTable(connection, tableName, 'DOUBLE', callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it('insert data, then select it', function (done) {
      // check insert success callback
      const successCB = (cb) => (err,results) => {
        should.not.exist(err);
        cb();
      }
      // mapper data -> () => query execution
      const insertMapper = (d) => (cb) => connection.execute("INSERT INTO " + tableName + " (f1) VALUES (?)",[d],successCB(cb));
      async.series(data.map(insertMapper), () => {
        connection.execute("SELECT * FROM " + tableName, [], function (err, results) {
          should.not.exist(err);
          results.should.be.ok();
          results.getRows(function (err, rows) {
            should.not.exist(err);
            should.exist(rows);
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

});
