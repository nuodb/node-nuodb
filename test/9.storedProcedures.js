// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({parseValues:true}).env({parseValues:true}).file({ file: args.config||'test/config.json' });

var DBConnect = nconf.get('DBConnect');


const sprocCreate = `
  CREATE OR REPLACE PROCEDURE DUMMY_PROCEDURE (in_number INT)
  AS
      CREATE TABLE IF NOT EXISTS PROCEDURE_TEST (F1 INT);
      INSERT INTO PROCEDURE_TEST VALUES (in_number);
  END_PROCEDURE
`;
const sprocDrop = `
  DROP PROCEDURE IF EXISTS DUMMY_PROCEDURE;
`;
const sprocCall = `CALL DUMMY_PROCEDURE(1)`;

const checkProcedure = `SELECT * FROM SYSTEM.PROCEDURES WHERE PROCEDURENAME = 'DUMMY_PROCEDURE'`;
const checkRan = `SELECT * FROM PROCEDURE_TEST`;

const dropTestTable = `DROP TABLE PROCEDURE_TEST`;

describe('9. testing stored procedures', () => {

  var driver = null;
  var connection = null;

  before('open connection', async () => {
    driver = new Driver();
    connection = await driver.connect(DBConnect);
    connection.should.be.ok();
  });

  after('close connection', async () => {
    await connection.execute(dropTestTable);
    await connection.close();
  });

  it('9.1 can create a stored procedure', async () => {
    let err = null;
    try {
      await connection.execute(sprocCreate);
    } catch (e) {
      err = e
    }
    should.not.exist(err)

    const results = await connection.execute(checkProcedure);
    results.should.be.ok();

    const rows = await results.getRows();
    (rows.length).should.be.eql(1);
  });

  it('9.2 can run a stored procedure', async () => {
    await connection.execute(sprocCall);
    const results = await connection.execute(checkRan);
    results.should.be.ok();

    const rows = await results.getRows();
    (rows.length).should.be.eql(1);
  });

  it('9.3 can drop a stored procedure', async () => {
    await connection.execute(sprocDrop);
    const results = await connection.execute(checkProcedure);
    results.should.be.ok();

    const rows = await results.getRows();
    (rows.length).should.be.eql(0);
  });

});
