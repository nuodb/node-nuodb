'use strict';

var nuodb = require('../');
var should = require('should');
var async = require('async');
var config = require('./config.js');
var helper = require('./typeHelper.js');

describe('25. typeString.js', function () {

  var connection = null;
  var tableName = "type_string";

  // See: STRING @ http://doc.nuodb.com/Latest/Content/SQL-String-and-Character-Types.htm
  var data = [
    null,
    "",
    "hello world"
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

  describe('25.1 testing STRING data', function () {
    before('create table, insert data', function (done) {
      async.series([
        function (callback) {
          helper.createTable(connection, tableName, 'STRING', callback);
        },
        function (callback) {
          helper.insertDataArray(connection, tableName, data, callback);
        }
      ], done);
    });

    after(function (done) {
      helper.dropTable(connection, tableName, done);
      // done();
    });

    it('25.1.1 result set stores STRING correctly', function (done) {
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