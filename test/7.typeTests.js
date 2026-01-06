// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var {
  Driver
} = require('..');
var should = require('should');
var async = require('async');
var helper = require('./typeHelper');
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({
  parseValues: true
}).env({
  parseValues: true
}).file({
  file: args.config || 'test/config.json'
});

var DBConnect = nconf.get('DBConnect');

var driver = null;
var connection = null;
var testCases = require('./typeTestCases').testCases;

describe('7. testing types', async () => {
  before('open connection', async () => {
    driver = new Driver();
    connection = await driver.connect(DBConnect);
  })

  after('close connection', async () => {
    await connection.close();
  });

  // This particular test started to fail with Node 22 as shown in JIRA NJS-42
  // The use of promises was removed in favor of callbacks since it seem
  // to be more in-line with the basic of desired behavior which was to run
  // each subtest after the previous, all serialized.  I did see promises worked
  // using the following syntax, but it seemed more confuscated to me
  // await async.series(testCases.map((curr, index) => async.asyncify(async () => { new Promise((res) => {
  await async.series(testCases.map((curr, index) => {
    return function(callback) {
      const {
        data,
        type
      } = curr;
      // use specified table name for test if exists, otherwise determine programatically by type
      const tableName = curr.tableName ?? `table_${type}`;
      const tableCreate = curr.tableCreate ?? helper.sqlCreateTable(tableName, type);
      const testDescription = curr.description ?? `type ${type}`;

      describe(`7.${index} Testing ${testDescription}`, () => {

        before(`create ${type} table, insert data`, async () => {
          await connection.execute(helper.sqlDropTable(tableName));
          await connection.execute(tableCreate);
          await async.series(data.map((d) => async () => {
            if (curr.tableInsert != undefined) {
              await connection.execute(curr.tableInsert, d);
            } else {
              await connection.execute(helper.sqlInsert(tableName), [d]);
            }
          }))
        });

        after((done) => {
          helper.dropTable(connection, tableName, () => {
            done();
          });
          //helper.dropTable(connection, tableName, () => {done();res();});
        });

        it(`7.${index} result set stores ${type} correctly`, async () => {
          const results = await connection.execute("SELECT F1 FROM " + tableName);
          results.should.be.ok();

          const rows = await results.getRows();
          should.exist(rows);
          // check the results via a predefined method, only if that method exists
          curr.checkResults?.(rows);
          await results.close();
        });
      });
      callback(null, 'OK');
    }
  }),
  // Normally one would use function(err, results)
  // but there is nothing to do with results when everything runs cleanly
  function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      // If no error there is no reason to pring results
      //console.log('Results:', results);
    }
  });
});
