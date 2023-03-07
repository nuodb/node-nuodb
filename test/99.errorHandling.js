// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";
import { Driver } from "../dist/index.js";
import {exec} from "child_process";
import should from "should";
import config from "./config.js";
import http from "http";
// const safeExecute from '../examples/safeExecute';
// const sshexec from 'ssh-exec';

//15 minutes, a long time but a lot of these tests take time to alter network settings and wait for those changes to be realized.
//const ERROR_HANDLING_TEST_TIMEOUT = 900000;
const POLL_RETRY = 50;
const POLL_WAIT = 500;
const postData = {
  engineType: "TE",
  host: "nuoadmin-3",
  dbName: "test",
};
const sleep = (ms) => new Promise((res) => {setTimeout(()=>res(), ms)})

/*
var v_host = 'XX.XX.XX.XXX'
var v_host = 'nuodbrdcbig01'
sshexec('ls -lh', {
  user: 'YYYY',
  host: 'nuodbrdcbig01',
  password: 'XXXX'
}).pipe(process.stdout , function (err, data) {
    if ( err ) { console.log(v_host); console.log(err); }
  console.log(data)
})
*/

const startTE = (postData) =>
  new Promise((res, rej) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: "8888",
        path: "/api/1/processes",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (response) => {
        response.on("data", (d) => {
          const responseMessage = JSON.parse(d.toString("utf8"));
          res(responseMessage);
        });
      }
    );
    req.on("error", (e) => rej(e));
    req.write(postData);
    req.end();
  });

const getProcess = (startId) =>
  new Promise((res, rej) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: "8888",
        path: `/api/1/processes/${startId}`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (response) => {
        response.on("data", (d) => {
          const responseMessage = JSON.parse(d.toString("utf8"));
          res(responseMessage);
        });
      }
    );
    req.on("error", (e) => rej(e));
    req.end();
  });

const killTE = (pid) => new Promise((res) => {
  exec(`kill -9 ${pid}`, () => res())
});

const pollForTERunning = async (startId) => {

  let procData = await getProcess(startId);
  for(let i = 0; i < POLL_RETRY && procData.state != "RUNNING"; i++){
    await sleep(POLL_WAIT);
    procData = await getProcess(startId);
  }

  if (procData.state == "RUNNING")
    return procData
  else
    throw "TE is not running..."

}

/*
const alterIPTableRules = (source,action) => Promise.all([
  // action = 'D' for deleting the rule, 'I' for inserting the rule
  // create this rule for both input and output an resolve alterIPTableRules
  new Promise((res) => {
    exec(`iptables -${action} INPUT -p tcp -s ${source} -j DROP ;`, (error,stdout,stderr) => {
      if(stderr)
        console.error(error)
      res();
    })
  }),
  new Promise((res) => {
    exec(`iptables -${action} OUTPUT -p tcp -s ${source} -j DROP ;`, (error,stdout,stderr) => {
      if(stderr)
        console.error(error)
      res();
    })
  })
])
*/

//const netDown = async () => await alterIPTableRules('localhost','I');
//const netUp = async () => await alterIPTableRules('localhost','D');

describe("14. Test errors", function () {
  // The length of time of the tests to complete has been uneven
  // This has been changed to use a 0 timeout, so no timeout, but
  // but obviously this would be bad in the event of true hang,
  // the test suite would get stuck.
  this.timeout(0);  let driver = null;
  let conn = null;

  before("open connection, init tables", async () => {
    //await netUp();
    driver = new Driver();

    conn = await driver.connect(config);

    conn.should.be.ok();

    let err = null;

    try {
      // create the tables
      await conn.execute("CREATE TABLE IF NOT EXISTS T1 (F1 int)");
      await conn.execute("CREATE TABLE IF NOT EXISTS T2 (F1 int)");

      await conn.execute("CREATE TABLE IF NOT EXISTS T3 (F1 int)");
      await conn.execute("CREATE UNIQUE INDEX UNIQUENESS_INDEX ON T3(F1)");

      // insert data into the tables
      await conn.execute("INSERT INTO T1 VALUES (1)");
      await conn.execute("INSERT INTO T2 VALUES (1)");

      const results = await conn.execute("select * from T1");
      const rows = await results.getRows();
      await results.close();
      rows.length.should.not.be.eql(0);
    } catch (e) {
      err = e;
    }
    should.not.exist(err);
  });

  after("close connection, delete tables", async () => {
    let err = null;

    try {
      // clean up tables
      await conn.execute("DROP TABLE IF EXISTS T1");
      await conn.execute("DROP TABLE IF EXISTS T2");

      await conn.execute("DROP TABLE IF EXISTS T3");
      await conn.execute("DROP INDEX UNIQUENESS_INDEX IF EXISTS");

      // close connections
      await conn.close();
    } catch (e) {
      err = e;
    }
    should.not.exist(err);
  });

  it("14.1 Can detect deadlock", async () => {
    // open up two connections with autocommit off
    const c1 = await driver.connect(config);
    const c2 = await driver.connect(config);

    c1.should.be.ok();

    const update_lock = true;
    const post_commit = true;

    c1.autoCommit = false;
    c2.autoCommit = false;
    // await c1.execute("set autocommit off");
    // await c2.execute("set autocommit off");
    if (update_lock) {
      await c2.execute("update T2 set F1=F1+1");
      await c1.execute("update T1 set F1=F1+1");
    }

    // now produce a deadlock condition
    let err = null;
    try {
      await Promise.all([
        c1.execute("update T2 set F1=F1+1"),
        c2.execute("update T1 set F1=F1+1"),
      ]);
    } catch (e) {
      err = e;
    }

    if (post_commit) {
      await c1.commit();
      await c2.commit();
    }

    should.exist(err);
    (err.message.includes('transaction deadlock')).should.be.true();

    // close the connections
    await c1.close();
    await c2.close();
  });

  it("14.2 Can detect an index uniqueness error", async () => {
    let err = null;
    try {
      await conn.execute("INSERT INTO T3 VALUES (1)");
      await conn.execute("INSERT INTO T3 VALUES (1)");
    } catch (e) {
      err = e;
    }
    should.exist(err);
    (err.message.includes('duplicate value in unique index')).should.be.true();
  });

  it("14.3 Can detect when a TE goes down before query execution", async () => {
    const newTE = await startTE(JSON.stringify(postData));
    let err = null;
    // wait to do anything until the TE is running.
    let TEProcData;
    try {
      TEProcData = await pollForTERunning(newTE.startId)
    } catch (e) {
      should.not.exist(e);
    }

    // create a connection to this TE
    const directConnection = await driver.connect({
      ...config,
      LBQuery: `round_robin(start_id(${newTE.startId}))`,
    });

    // kill the TE
    try {
      await killTE(TEProcData.pid);
    } catch (e) {
      should.not.exist(e);
    }

    // try to execute a query on the TE
    let results;
    try {
      results = await directConnection.execute(
        "select getnodeid() from dual"
      );
      await results.getRows();
      await results.close();
    } catch (e) {
      err = e;
    }
    should.exist(err);
    (err.message.includes('Connection reset by peer')
      || err.message.includes('connection closed')
    ).should.be.true();
    try {
      await results.close();
      await directConnection.close();
    } catch (e) {
      // do nothing
    }
  });
  // Commenting out the rest of the tests until they can addressed to run as root and be reliable
  /*
  it("14.4 Can detect when a TE goes down after query execution", async () => {
    const newTE = await startTE(JSON.stringify(postData));
    let err = null;
    // wait to do anything until the TE is running.
    let TEProcData;
    try {
      TEProcData = await pollForTERunning(newTE.startId)
    } catch (e) {
      should.not.exist(e);
    }

    // create a connection to this TE
    const directConnection = await driver.connect({
      ...config,
      LBQuery: `round_robin(start_id(${newTE.startId}))`,
    });

    // try to execute a query on the TE, kill before getting results
    let results;
    try {
      results = await directConnection.execute(
        "select getnodeid() from dual"
      );
      await killTE(TEProcData.pid);
      await results.getRows();
      await results.close();
    } catch (e) {
      err = e;
      console.error(e);
    }
    should.exist(err);
    (err.message.includes('failed to get more result set rows')).should.be.true();
    try {
      await results.close();
      await directConnection.close();
    } catch (e) {
      // do nothing
    }
  });

  it('14.5 Can detect a network timeout on connection', async () => {
    await netDown();
    let err;
    try {
      const conn = await driver.connect(config);
      const results = await conn.execute('select * from system.nodes');
      await results.getRows();
      await results.close();
    } catch (e) {
      err = e;
      console.error(e);
    }
    await netUp();
    should.exist(err);
    (err.message.includes('Connection timed out')).should.be.true();
  }).timeout(ERROR_HANDLING_TEST_TIMEOUT);

  it('14.6 Can detect a network timeout on an open connection', async () => {
    const newTE = await startTE(JSON.stringify(postData));
    let err, results;
    // wait to do anything until the TE is running.
    let TEProcData;
    try {
      TEProcData = await pollForTERunning(newTE.startId)
    } catch (e) {
      should.not.exist(e);
    }

    // create a connection to this TE
    const conn = await driver.connect({
      ...config,
      LBQuery: `round_robin(start_id(${newTE.startId}))`,
    });

*/
  //const tcpKillCommand = `lsof -i tcp:${TEProcData.port} | awk '/node/ {print $9;}' | sed 's/.*:\\([0-9]\\+\\)->.*/\\1/p' -n | tail -n 1 | xargs tcpkill -i lo -9 port 2>/dev/null`;
/*    await new Promise((res) => {
      // the TCP command will open a continuous tcpkill process, which will kill the connection after it detects traffic
      // this must be left running until the connection is killed
      // save a reference to this process to kill it later
      let childProcess;
      childProcess = exec(tcpKillCommand,{setsid:true, timeout: 10000}, (err, stdout, stderr) => {
        if(stderr)
          console.log(stderr);
      })
      res(childProcess)
    });

    await sleep(5000);
    try {
      await conn.execute('create table if not exists netTest(F1 int)');
      // kill traffic loop
      for(let i = 0; i < 10; i++){
        await conn.execute('insert into netTest values (13)');
        results = await conn.execute('select * from system.nodes');
        await results.getRows();
        await results.close();
        await sleep(500);
      }
    } catch (e) {
      err = e;
      console.error(e);
    }
    should.exist(err);
    (err.message.includes('Connection reset by peer')
      || err.message.includes('connection closed')
    ).should.be.true();
    // kill the TE
    try {
      await killTE(TEProcData.pid);
    } catch (e) {
      should.not.exist(e);
    }
  }).timeout(ERROR_HANDLING_TEST_TIMEOUT);

  it("14.7 Can recover from an error", async () => {
    let safeErr, mutErr, retVal;
    const prework = async (mutables, err) => {
      if(err){
        // if there was an error increment the insert value, and keep a reference
        mutables.insertValue++;
        mutables.err = err;
      }
    }
    const work = async (mutables) => {
      // T3 has a uniqueness index, and will already have a value
      await mutables.conn.execute(`insert into T3 values (${mutables.insertValue})`);
      return mutables.insertValue;
    }

    // insert this value, to cause a recoverable error during safeExecute
    const mutables = {insertValue:13, conn};
    await conn.execute(`insert into T3 values (${mutables.insertValue})`);

    const retryLimit = 5;
    try {
      retVal = await safeExecute(retryLimit,work,prework,mutables);
    } catch (e) {
      safeErr = e;
    } finally {
      mutErr = mutables.err;
    }

    should.not.exist(safeErr);
    should.exist(mutErr);
    (retVal).should.be.eql(14);

  });
  */
});
