// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
var config = require('./config');
var helper = require('./typeHelper');
var async = require('async');

const data = [
  'hello world',
  'hello test',
  'test world'
]

const tableName = 'CLAUSE_TEST';

const likeQuery = `select * from ${tableName} where f1 like 'hello%'`;
const startingQuery = `select * from ${tableName} where f1 not starting with 'test'`;
const containingQuery = `select * from ${tableName} where f1 containing 'world'`;
const regexpQuery = `select * from ${tableName} where f1 regexp '^hello'`;



describe('10. pattern matching clauses', () => {

  var driver = null;
  var connection = null;

  before('open connection, init tables', async () => {
    driver = new Driver();
    connection = await driver.connect(config);
    connection.should.be.ok();

    await connection.execute(helper.sqlDropTable(tableName));
    await connection.execute(helper.sqlCreateTable(tableName,'STRING'));
    await async.series(data.map( d => 
      async () => await connection.execute(helper.sqlInsert(tableName),[d]))
    );
  });

  after('close connection', async () => {
    await connection.execute(helper.sqlDropTable(tableName));
    await connection.close();
  });

  it('10.1 LIKE clause', async () => {
    let err = null;

    try {
      const results = await connection.execute(likeQuery);
      results.should.be.ok();
      const rows = await results.getRows();
      (rows.length).should.be.eql(2);
    } catch (e) {
      err = e
    }

    should.not.exist(err)
  });

  it('10.2 STARTING clause', async () => {
    let err = null;

    try {
      const results = await connection.execute(startingQuery);
      results.should.be.ok();
      const rows = await results.getRows();
      (rows.length).should.be.eql(2);
    } catch (e) {
      err = e
    }

    should.not.exist(err)
  });

  it('10.3 CONTAINING clause', async () => {
    let err = null;

    try {
      const results = await connection.execute(containingQuery);
      results.should.be.ok();
      const rows = await results.getRows();
      (rows.length).should.be.eql(2);
    } catch (e) {
      err = e
    }

    should.not.exist(err)
  });

  it('10.4 REGEXP clause', async () => {
    let err = null;

    try {
      const results = await connection.execute(regexpQuery);
      results.should.be.ok();
      const rows = await results.getRows();
      (rows.length).should.be.eql(2);
    } catch (e) {
      err = e
    }

    should.not.exist(err)
  });
});
