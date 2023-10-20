// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var async = require('async');
var should = require('should');

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
    should.not.exist(results);
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
  // console.log(values);
  async.series(values.map((value) => (cb) => {
    console.log(value);
    connection.execute(helper.sqlInsert(tableName), [value], function (err, results) {
      should.not.exist(err);
      should.not.exist(results);
      if (err != null) {
        console.log(err);
      }
      cb();
    });
  }), done);
};

helper.sqlCreateTwoColumnTable = function (tableName, types) {
  var sql = 'CREATE TABLE IF NOT EXISTS {0} (\n'.format(tableName);

  let i = 0;
  for (i = 0; i < types.length - 1; i++) {
    sql = sql.concat('f{0} {1},\n'.format(i + 1, types[i]));
  }

  sql = sql.concat('f{0} {1}\n'.format(i + 1, types[i]))
  sql = sql.concat(');');

  // console.log(sql);
  return sql;
};

helper.createTwoColumnTable = function (connection, tableName, types, done) {
  connection.execute(helper.sqlCreateTwoColumnTable(tableName, types), function (err, results) {
    should.not.exist(err);
    should.not.exist(results);
    done();
  });
};

helper.sqlInsertTwo = function (tableName) {
  var insert = 'INSERT INTO ' + tableName + '\
  (f1, f2) VALUES (?,?)';
  return insert;
};

helper.insertRandomRows = function (connection, tableName, generator, done) {
  for (let row of generator) {
    connection.execute(helper.sqlInsertTwo(tableName), row, function (err, results) {
      should.not.exist(err);
      if (err != null) {
        console.log(err);
      }
      results.close(function (err) {
        if (err != null) {
          console.log(err);
        }
      });
    });
  }
  done();
};

helper.yieldRandomRows = function* (count, length) {
  var crypto = require("crypto");
  for (var i = 0; i < count; i++) {
    yield [i, crypto.randomBytes(length).toString('hex')];
  }
}
