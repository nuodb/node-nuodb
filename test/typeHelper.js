'use strict';

var nuodb = require('../');
var async = require('async');

var helper = exports;

helper.sqlCreateTable = function (tableName, dataType) {
  var createTable = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' \
    (\
    f1 '+ dataType + '\
  );';
  return createTable;
};

helper.sqlDropTable = function (tableName) {
  var dropTable = 'DROP TABLE IF EXISTS ' + tableName + ';';
  return dropTable;
};

helper.sqlInsert = function (tableName) {
  var insert = 'INSERT INTO ' + tableName + '\
  (f1) VALUES (?)';
  return insert;
};

helper.createTable = function (connection, tableName, type, done) {
  connection.execute(helper.sqlCreateTable(tableName, type), function (err, results) {
    should.not.exist(err);
    done();
  });
};

helper.dropTable = function (connection, tableName, done) {
  connection.execute(helper.sqlDropTable(tableName), function (err) {
    should.not.exist(err);
    done();
  });
};

helper.insertDataArray = function (connection, tableName, values, done) {
  console.log(values);
  async.each(values, function (value, cb) {
    console.log(value);
    connection.execute(helper.sqlInsert(tableName), [value], function (err) {
      should.not.exist(err);
      if (err != null) {
        console.log(err);
      }
    });
    cb();
  }, done);
};
