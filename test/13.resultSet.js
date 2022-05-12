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

// constants for 13.1
const tableNameChunk = 'TEST_RESULTSET';
const tableTypeChunk = 'INTEGER';
const createTableChunk = helper.sqlCreateTable(tableNameChunk,tableTypeChunk);
const dropTableChunk = helper.sqlDropTable(tableNameChunk);

const tableQueryChunk = `SELECT * FROM ${tableNameChunk}`;
const numRowsChunk = 1000;
const getChunkSize = 50;

// constants for 13.2
const createJoinableTables = (t) => `create table test_result_set_${t} (id int, ${t} int)`
const dropJoinableTables = (t) => `drop table test_result_set_${t}`
const getJoinableTableInsert = (t,i,v) => `insert into test_result_set_${t} values (${i},${v})`
const selectFromJoinableTables = (a,b) => `select * from test_result_set_${a} as ta inner join test_result_set_${b} as tb on ta.id=tb.id`
const selectAliasFromJoinableTables = (a,b) => `select a.id as aid, a.a, b.id as bid, b.b from test_result_set_${a} as a , test_result_set_${b} as b`
const joinableTablesLength = 5;
describe('13. Test Result Set', () => {

  var driver = null;
  var connection = null;

  before('open connection, init tables', async () => {
    driver = new Driver();
    connection = await driver.connect(config);
    connection.should.be.ok();

    // for 13.1 Can get results in chunks
    await connection.execute(createTableChunk);
    // insert all the data
    for(let i = 0; i < numRowsChunk; i++){
      await connection.execute(helper.sqlInsert(tableNameChunk), [i]);
    }

    // for 13.2 Can get multiple columns with same name in a join
    await connection.execute(createJoinableTables('a'));
    await connection.execute(createJoinableTables('b'));
    for(let i = 0; i < joinableTablesLength; i++){
      await connection.execute(getJoinableTableInsert('a',i,0));
      await connection.execute(getJoinableTableInsert('b',i,1));
    }
  });

  after('close connection', async () => {
    await connection.execute(dropTableChunk);
    await connection.execute(dropJoinableTables('a'));
    await connection.execute(dropJoinableTables('b'));
    await connection.close();
  });

  it('13.1 Can get results in chunks', async () => {
    let err = null;
    try {
      const results = await connection.execute(tableQueryChunk);
      for(let i = 0; i < numRowsChunk; i+=getChunkSize){
        const rows = await results.getRows(getChunkSize);
        (rows.length).should.be.eql(getChunkSize);
        (rows[getChunkSize-1]['F1']).should.be.eql(i);
      }
    } catch (e) {
      err = e;
    }

    should.not.exist(err);
  });

  it('13.2 Can get full result set from tables with duplicate column name', async () => {
    let err = null;
    try {
      const results = await connection.execute(selectFromJoinableTables('a','b'), {rowMode:0});
      const rows = await results.getRows();
      const columns = Object.keys(rows[0]);
      (columns.length).should.be.eql(4);
    } catch (e) {
      err = e;
    }

    should.not.exist(err);
  });

  it('13.3 Can alias a column label', async () => {
    let err = null;
    try {
      const results = await connection.execute(selectAliasFromJoinableTables('a','b'));
      const rows = await results.getRows();
      const columns = Object.keys(rows[0]);
      (columns.length).should.be.eql(4);
      columns.should.containEql('AID');
      columns.should.containEql('BID');
    } catch (e) {
      err = e;
    }

    should.not.exist(err);

  });

}).timeout(RESULT_SET_TEST_TIMEOUT);
