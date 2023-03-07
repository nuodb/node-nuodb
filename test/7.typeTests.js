// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

import { Driver } from '../dist/index.js';
import should from 'should';
import async from 'async';
import config from './config.js';
import helper from './typeHelper.js';

var driver = null;
var connection = null;
import { testCases } from './typeTestCases.js';

//! Getting "Error: expected a function"

/*
describe('7. testing types', async () => {
  before('open connection', async () => {
    driver = new Driver();
    connection = await driver.connect(config);
  })

  after('close connection', async () => {
    await connection.close();
  });


  await async.series(testCases.map((curr, index) => new Promise((res) => {
    console.debug('TESTING', curr);
    const {data,type} = curr;
    // use specified table name for test if exists, otherwise determine programatically by type
    const tableName = curr.tableName ?? `table_${type}`;
    const tableCreate = curr.tableCreate ?? helper.sqlCreateTable(tableName, type);
    const testDescription = curr.description ?? `type ${type}`;
    
    console.debug('TESTING 2');
    describe(`7.${index} Testing ${testDescription}`, () => {
      
      before(`create ${type} table, insert data`, async () => {
        console.debug('TESTING 3');
        await connection.execute(helper.sqlDropTable(tableName));
        console.debug('TESTING 4');
        await connection.execute(tableCreate);
        await async.series(data.map((d) => async () => {
          if(curr.tableInsert != undefined){
            await connection.execute(curr.tableInsert, d);
          } else {
            await connection.execute(helper.sqlInsert(tableName),[d]);
          }
        }))
      });
      
      after((done) => {
        helper.dropTable(connection, tableName, () => {done();res();});
      });
      
      it(`7.${index} result set stores ${type} correctly`, async () => {
        console.debug('TESTING 5');
        const results = await connection.execute("SELECT F1 FROM " + tableName);
        results.should.be.ok();

        const rows = await results.getRows();
        should.exist(rows);
        // check the results via a predefined method, only if that method exists
        curr.checkResults?.(rows);
        await results.close();
      });
    });
  })));
});
*/