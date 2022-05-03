// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { Driver } = require('..');

const should = require('should');
const config = require('./config');
const async = require('async');
const http = require('http');

const startTE = (postData) => new Promise((res,rej) => {
  const req = http.request({
    hostname: 'localhost',
    port: '8888',
    path: '/api/1/processes',
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (response) => {
    response.on('data', (d) => {
      const responseMessage = JSON.parse(d.toString('utf8'));
      res(responseMessage);
    });
  });
  req.on('error', (e) => rej(e));
  req.write(postData);
  req.end();
}); 

const getProcess = (startId) => new Promise((res,rej) => {
  const req = http.request({
    hostname: 'localhost',
    port: '8888',
    path: `/api/1/processes/${startId}`,
    method: 'GET',
    headers: {
      'Content-Type':'application/json',
    }
  }, (response) => {
    response.on('data', (d) => {
      const responseMessage = JSON.parse(d.toString('utf8'));
      res(responseMessage);
    });
  });
  req.on('error', (e) => rej(e));
  req.end();
}); 

const sleep = (ms) => new Promise((res,rej) => {
  setTimeout(()=>res(),ms);
});


describe('14. Test errors', () => {

  let driver = null;
  let conn = null

  let deadlock_create_table = true;
  let deadlock_populate_table = true;
  let deadlock_drop_table = false;
  
  let test_index = false;

  before('open connection, init tables', async () => {
    driver = new Driver();

    conn = await driver.connect(config);

    conn.should.be.ok();

    let err = null;

    try {
      // create the tables
      if (deadlock_create_table) {
        await conn.execute('CREATE TABLE IF NOT EXISTS T1 (F1 int)');
        await conn.execute('CREATE TABLE IF NOT EXISTS T2 (F1 int)');
      }

      if (test_index) {
        await conn.execute('CREATE TABLE IF NOT EXISTS T3 (F1 int)');
        await conn.execute('CREATE UNIQUE INDEX UNIQUENESS_INDEX ON T3(F1)');
      }

      // insert data into the tables
      if (deadlock_populate_table) {
        await conn.execute('INSERT INTO T1 VALUES (1)');
        await conn.execute('INSERT INTO T2 VALUES (1)');
      }

      const results = await conn.execute('select * from T1');
      const rows = await results.getRows();
      await results.close();
      (rows.length).should.not.be.eql(0);
    } catch (e) {
      err = e
    }
    should.not.exist(err)
  });

  after('close connection, delete tables', async () => {
    let err = null;

    try {
      // clean up tables
      if (deadlock_drop_table) {
        await conn.execute('DROP TABLE IF EXISTS T1');
        await conn.execute('DROP TABLE IF EXISTS T2');
      }

      if (test_index) {
        await conn.execute('DROP TABLE IF EXISTS T3');
        await conn.execute('DROP INDEX UNIQUENESS_INDEX IF EXISTS');
      }

      // close connections
      await conn.close();
    } catch (e) {
      err = e
    }
    should.not.exist(err)
  });

  it('13.1 Can detect deadlock', async () => {
    // open up two connections with autocommit off
    const c1 = await driver.connect(config);
    const c2 = await driver.connect(config);

    c1.should.be.ok();


    const update_lock = true;
    const post_commit = true;


    await c1.execute('set autocommit off');
    await c2.execute('set autocommit off');
    

    if(update_lock) {
      await c2.execute('update T2 set F1=F1+1');
      await c1.execute('update T1 set F1=F1+1');
    }

    // now produce a deadlock condition
    let err = null;
    try {
      console.log("updating now");
      setTimeout(()=>console.log("update should be finished"),15000);
      await Promise.all(
        [c1.execute('update T2 set F1=F1+1'),
       c2.execute('update T1 set F1=F1+1')]
      )
    }  catch (e) {
      err = e;
      console.error(e);
    }

    if (post_commit) {
      await c1.commit();
      await c2.commit();
    }

    should.exist(err);

    // close the connections
    await c1.close();
    await c2.close();
    
  });

  it('13.2 Can detect an index uniqueness error', async () => {
    let err = null;
    try {
      await conn.execute('INSERT INTO T3 VALUES (1)');
      await conn.execute('INSERT INTO T3 VALUES (1)');
    } catch (e) {
      err = e;
      console.error(e);
    }
    should.exist(err);
  });
  it('13.3 Can detect when a TE goes down', async () => {
    const postData = {
      engineType: 'TE',
      host: 'nuoadmin-0',
      dbName: 'test'
    }
    const newTE = await startTE(JSON.stringify(postData));
    let err = null;

    // convert this to a promise that the TE will enter the running state
    const pollForTERunning = async (startId, retry) => {
      const procData = await getProcess(startId);
      if(procData.state == 'RUNNING'){
        try {
        // connect to the new te
          // confirm that the connection is good
          // kill the te forcibly (using kill -9)  process.execSync
          // trap the error
      } catch (e) {
        err = e;
      }
        // resolve the promise here
      } else if(retry > 0){
        // queue up another poll
        setTimeout(pollForTERunning(startId, retry-1), 1000);
      }
    }

    should.exist(err);

    const directConnection = await driver.connect({...config, LBQuery: `round_robin(start_id(${newTE.startId}))`});
    const results = await directConnection.execute('select getnodeid() from dual');
    const rows = await results.getRows();
    console.log(rows);
    await results.close();
    await directConnection.close();
  });

});
