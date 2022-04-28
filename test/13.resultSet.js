// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const RESULT_SET_TEST_TIMEOUT = 50000;

var { Driver } = require('..');

var should = require('should');
var config = require('./config');
var helper = require('./typeHelper');

const tableName = 'TEST_RESULTSET';
const tableType = 'INTEGER';
const createTable = helper.sqlCreateTable(tableName,tableType);
const dropTable = helper.sqlDropTable(tableName);

const tableQuery = `SELECT * FROM ${tableName}`;
const numRows = 1000;
const getChunkSize = 50;


describe('13. Test Result Set', () => {

  var driver = null;
  var connection = null;

  before('open connection, init tables', async () => {
    driver = new Driver();
    connection = await driver.connect(config);
    connection.should.be.ok();

    await connection.execute(createTable);

    // insert all the data
    for(let i = 0; i < numRows; i++){
      await connection.execute(helper.sqlInsert(tableName), [i]);
    }
  });

  after('close connection', async () => {
    await connection.execute(dropTable);
    await connection.close();
  });

  it('13.1 Can get results in chunks', async () => {
    let err = null;
    try {
      const results = await connection.execute(tableQuery);
      for(let i = 0; i < numRows; i+=getChunkSize){
        const rows = await results.getRows(getChunkSize);
        (rows.length).should.be.eql(getChunkSize);
        (rows[getChunkSize-1]['F1']).should.be.eql(i);
      }
    } catch (e) {
      err = e;
    }

    should.not.exist(err);
  });


}).timeout(RESULT_SET_TEST_TIMEOUT);
