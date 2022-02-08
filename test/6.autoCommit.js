// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";

var { Driver } = require("..");
var should = require("should");
var async = require("async");
var config = require("./config");
var helper = require("./typeHelper");

describe("6. autoCommit.js", function () {
  var driver = null;
  var connection = null;
  var tableName = "auto_commit";

  // See: STRING @ http://doc.nuodb.com/Latest/Content/SQL-String-and-Character-Types.htm
  var data = ["hello world"];

  before("open connection", function (done) {
    driver = new Driver();
    driver.connect(config, function (err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after("close connection", function (done) {
    connection.close(function (err) {
      should.not.exist(err);
      done();
    });
  });

  describe("6.1 testing STRING data autoCommit off", function () {
    before("create table, insert data", function (done) {
      async.series([
        function (callback) {
          helper.dropTable(connection, tableName, callback);
        },
        function (callback) {
          helper.createTable(connection, tableName, "STRING", callback);
        },
        function (callback) {
          connection
            .execute("INSERT INTO " + tableName + " (f1) VALUES (?)", data, {
              autoCommit: false,
            })
            .then(() => {
              connection.execute(
                "INSERT INTO " + tableName + " (f1) VALUES (?)",
                data,
                { autoCommit: false }
              );
            })
            .then(() => {
              connection.commit();
              callback();
            })
            .catch((e) => console.log(e.stack()));
        },
        // check that rollback does not commit
        function (callback) {
          connection
            .execute("INSERT INTO " + tableName + " (f1) VALUES (?)", data, {
              autoCommit: false,
            })
            .then(() => {
              connection.execute(
                "INSERT INTO " + tableName + " (f1) VALUES (?)",
                data,
                { autoCommit: false }
              );
            })
            .then(() => {
              connection.rollback();
              callback();
            })
            .catch((e) => console.log(e.stack()));
        },
        function () {
          done();
        },
      ]);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
    });

    it("6.1.1 result set stores STRING correctly with autoCommit off", function (done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        function (err, results) {
          should.not.exist(err);
          results.should.be.ok();
          results.getRows(function (err, rows) {
            should.not.exist(err);
            should.exist(rows);
            console.log(rows);
            should.equal(rows.length, 2, "There should only be two results");
            results.close(function (err) {
              should.not.exist(err);
              done();
            });
          });
        }
      );
    });
  });
});
