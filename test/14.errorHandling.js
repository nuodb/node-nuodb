// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";
const {
  Driver
} = require("..");
const {
  exec
} = require("child_process");
const should = require("should");
const http = require("http");
const safeExecute = require('../examples/safeExecute');
const sshexec = require('ssh-exec');
var process = require('process');
var nconf = require('nconf');
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
var REST = nconf.get('REST');
var extraTE = nconf.get('extraTE');
var sshInfo = nconf.get('sshInfo');

//console.log(nconf.get('DBConnect'));
//console.log(nconf.get('REST'));
//console.log(nconf.get('extraTE'));
//console.log(nconf.get('sshInfo'));

//15 minutes, a long time but a lot of these tests take time to alter network settings and wait for those changes to be realized.
const ERROR_HANDLING_TEST_TIMEOUT = 1200000;
const POLL_RETRY = 50;
const POLL_WAIT = 500;

const sleep = (ms) => new Promise((resolve, reject) => {
  try {
    setTimeout(() => resolve(), ms)
  } catch (e) {
    reject(e);
  }
})

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

const startEngine = (postData) =>
  // curl -X POST -H "Content-type: application/json" http://localhost:8888/api/1/processes -d '{ "dbName": "test", "engineType": "TE", "host": "nuoadmin-1", "overrideOptions": { "mem":"100000000" } }'
  new Promise((resolve, reject) => {
    const req = http.request({
      ...REST,
      path: "/api/1/processes",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    (response) => {
      var responseMessage = '';
      response.on("data", (d) => {
        responseMessage = JSON.parse(d.toString("utf8"));
        resolve(responseMessage);
      });
      response.on('end', function() {
        // console.log(responseMessage.startId);
      });
    }
    );
    req.on("error", (e) => reject(e));
    req.write(postData);
    req.end();
  });

const stopTE = (startId) =>
  //curl -X DELETE http://localhost:8888/api/1/processes/145
  new Promise((resolve, reject) => {
    const req = http.request({
      ...REST,
      path: `/api/1/processes/${startId}`,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    },
    (response) => {
      response.on("data", (d) => {
        const responseMessage = JSON.parse(d.toString("utf8"));
        resolve(responseMessage);
      });
    }
    );
    req.on("error", (e) => reject(e));
    req.end();
  });

const getProcess = (startId) =>
  new Promise((resolve, reject) => {
    const req = http.request({
      ...REST,
      path: `/api/1/processes/${startId}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    (response) => {
      response.on("data", (d) => {
        const responseMessage = JSON.parse(d.toString("utf8"));
        resolve(responseMessage);
      });
    }
    );
    req.on("error", (e) => reject(e));
    req.end();
  });

function executeKillProcess(pid) {
  return new Promise((resolve, reject) => {
    sshexec(`sudo kill -9 ${pid}`,
      sshInfo,
      (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      }
    )
  })
}

async function killProcess(pid) {
  await executeKillProcess(pid);
}

const pollForTERunning = async (startId) => {
  let procData = await getProcess(startId);
  for (let i = 0; i < POLL_RETRY && procData.state != "RUNNING"; i++) {
    await sleep(POLL_WAIT);
    procData = await getProcess(startId);
  }

  if (procData.state == "RUNNING")
    return procData
  else
    throw "TE is not running..."
}

function alterIPTableRules(action, ports, target) {
  return new Promise((resolve, reject) => {
    // action = 'D' for deleting the rule, 'I' for inserting the rule
    // create this rule for both input and output an resolve alterIPTableRules
    // sshexec(`sudo iptables -${action} INPUT -p tcp --match multiport --dports 48004:48020  -j DROP`,
    sshexec(`sudo iptables -${action} INPUT -p tcp ${ports} -j ${target}`,
      sshInfo,
      (error, data) => {
        if (error) {
          console.error(error);
          return reject(error);
        }
        resolve(data);
      }
    )
  })
}

const netAdminDown = async () => await alterIPTableRules('A', '--dport 48004', 'DROP');
const netAdminUp = async () => await alterIPTableRules('D', '--dport 48004', 'DROP');
//const netHostDown = async () => await alterIPTableRules('A', '--match multiport --dport 48004:48020', 'DROP');
//const netHostUp = async () => await alterIPTableRules('D', '--match multiport --dport 48004:48020', 'DROP');

describe("14. Test errors", function() {
  // The length of time of the tests to complete has been uneven
  // This has been changed to use a 0 timeout, so no timeout, but
  // but obviously this would be bad in the event of true hang,
  // the test suite would get stuck.
  this.timeout(0);
  let driver = null;
  let conn = null;

  before("open connection, init tables", async () => {
    // await netHostUp();
    driver = new Driver();

    //conn = await driver.connect(config.DBConnect);
    conn = await driver.connect(DBConnect);

    conn.should.be.ok();

    let err = null;

    try {
      await conn.execute("DROP TABLE IF EXISTS T1");
      await conn.execute("DROP TABLE IF EXISTS T2");

      await conn.execute("DROP INDEX UNIQUENESS_INDEX IF EXISTS");
      await conn.execute("DROP TABLE IF EXISTS T3");

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
      console.log(e);
    }
    should.not.exist(err);
  });

  after("close connection, delete tables", async () => {
    let err = null;

    try {
      // clean up tables
      await conn.execute("DROP TABLE IF EXISTS T1");
      await conn.execute("DROP TABLE IF EXISTS T2");

      await conn.execute("DROP INDEX UNIQUENESS_INDEX IF EXISTS");
      await conn.execute("DROP TABLE IF EXISTS T3");

      // close connections
      await conn.close();
    } catch (e) {
      err = e;
      console.log(e);
    }
    should.not.exist(err);
  });

  it("14.1 Can detect deadlock", async () => {
    // open up two connections with autocommit off
    const c1 = await driver.connect(DBConnect);
    const c2 = await driver.connect(DBConnect);

    c1.should.be.ok();

    const update_lock = true;
    const post_commit = true;

    c1.autoCommit = false;
    c2.autoCommit = false;
    // await c1.execute("set autocommit off");
    // await c2.execute("set autocommit off");

    if (update_lock) {
      await c1.execute("update T1 set F1=F1+1");
      await c2.execute("update T2 set F1=F1+1");
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
      console.log(e);
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
      console.log(e);
    }
    should.exist(err);
    (err.message.includes('duplicate value in unique index')).should.be.true();
  });

  it("14.3 Can detect when a TE goes down before query execution", async () => {
    const newTE = await startEngine(JSON.stringify(extraTE));
    let err = null;
    // wait to do anything until the TE is running.
    let TEProcData;
    try {
      TEProcData = await pollForTERunning(newTE.startId)
    } catch (e) {
      console.log(`Polling: ${e}`);
      should.not.exist(e);
    }

    // create a connection to this TE
    let directConnection = null;
    try {
      directConnection = await driver.connect({
        ...DBConnect,
        LBQuery: `round_robin(start_id(${newTE.startId}))`,
      });
    } catch (e) {
      console.log(`Connect: ${e}`);
      should.not.exist(e);
    }

    // kill the TE
    try {
      await killProcess(TEProcData.pid);
    } catch (e) {
      console.log(`Kill: ${e}`);
      should.not.exist(e);
    }

    await sleep(60 * 500);

    // try to execute a query on the TE
    let results;
    try {
      results = await directConnection.execute(
        "select getnodeid() from dual"
      );
      await results.getRows();
    } catch (e) {
      err = e;
      console.log(e);
    }
    should.exist(err);
    (err.message.includes('Connection reset by peer') ||
      err.message.includes('connection closed')
    ).should.be.true();

    try {
      await results?.close();
      await directConnection.close();
    } catch (e) {
      // do nothing
    }
  });

  it("14.4 Can detect when a TE goes down after query execution", async () => {
    const newTE = await startEngine(JSON.stringify(extraTE));
    let err = null
    // wait to do anything until the TE is running.
    let TEProcData;
    try {
      TEProcData = await pollForTERunning(newTE.startId)
    } catch (e) {
      console.log(e);
      should.not.exist(e);
    }

    // create a connection to this TE
    let directConnection = null;
    try {
      directConnection = await driver.connect({
        ...DBConnect,
        LBQuery: `round_robin(start_id(${newTE.startId}))`,
      });
    } catch (e) {
      console.log(`Connect: ${e}`);
      should.not.exist(e);
    }

    // try to execute a query on the TE, kill before getting results
    let results;
    try {
      results = await directConnection.execute(
        "select getnodeid() from dual"
      );
      await killProcess(TEProcData.pid);
      await results.getRows();
      await results.close();
    } catch (e) {
      err = e;
      console.log(e);
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
    await netAdminDown();
    var err;
    try {
      const conn = await driver.connect(DBConnect);
      const results = await conn.execute('select * from system.nodes');
      await results.getRows();
      await results.close();
    } catch (e) {
      err = e;
      console.log(e);
    }
    await netAdminUp();
    should.exist(err);
    (err.message.includes('Connection timed out')).should.be.true();
  }).timeout(ERROR_HANDLING_TEST_TIMEOUT);


  it("14.6 Can recover from an error", async () => {
    var safeErr, mutErr, retVal;
    const prework = async (mutables, err) => {
      if (err) {
        // if there was an error increment the insert value, and keep a reference
        mutables.insertValue++;
        mutables.err = err;
      }
      return mutables;
    }
    const work = async (mutables) => {
      // T3 has a uniqueness index, and will already have a value
      await mutables.conn.execute(`insert into T3 values (${mutables.insertValue})`);
      return mutables.insertValue;
    }

    // insert this value, to cause a recoverable error during safeExecute
    let mutables = {
      insertValue: 13,
      conn
    };
    await conn.execute(`insert into T3 values (${mutables.insertValue})`);

    const retryLimit = 5;
    try {
      retVal = await safeExecute(retryLimit, work, prework, mutables);
    } catch (e) {
      safeErr = e;
      console.log(e);
    } finally {
      mutErr = mutables.err;
    }

    should.not.exist(safeErr);
    should.exist(mutErr);
    (retVal).should.be.eql(14);

  });

  it('14.7 Can detect a network timeout on an open connection', async () => {
    const newTE = await startEngine(JSON.stringify(extraTE));
    let err, results;
    // wait to do anything until the TE is running.
    let TEProcData;
    try {
      TEProcData = await pollForTERunning(newTE.startId)
    } catch (e) {
      console.log(e);
      should.not.exist(e);
    }

    // create a connection to this TE
    let directConnection = null;
    try {
      directConnection = await driver.connect({
        ...DBConnect,
        LBQuery: `round_robin(start_id(${newTE.startId}))`,
      });
    } catch (e) {
      console.log(`Connect: ${e}`);
      should.not.exist(e);
    }

    const tcpKillCommand = `sudo lsof -w -p ${process.pid} | \
                                 awk '/${TEProcData.options['node-port']}/ && /${TEProcData.hostname}/  {print $9}' | \
                                 sed 's/.*:\\([0-9]\\+\\)->.*/\\1/p' -n | \
                                 tail -n 1 | \
                                 xargs -0 sudo tcpkill -9 port > /dev/null 2>&1`;
    let childProcess;
    // the TCP command will open a continuous tcpkill process, which will kill the connection after it detects traffic
    // this must be left running until the connection is killed
    // save a reference to this process to kill it later
    childProcess = exec(tcpKillCommand, {
      setsid: true
    }, (err, stdout, stderr) => {
      // tcpkill is a utiity that just perpetually runs until it is stopped, when killed off, the command sequence produces a particular error message
      // if the error message is something than we should expect, then print it for later diagnosis
      if (err != `Error: Command failed: ${tcpKillCommand}\n`)
        console.log(`CHILD: ${childProcess} ${err} ${stdout} ${stderr}`);
    })

    await sleep(60 * 500);

    try {
      await directConnection.execute('create table if not exists netTest(F1 int)');
      // kill traffic loop
      for (let i = 1; i < 50; i++) {
        await directConnection.execute('insert into netTest values (13)');
        results = await directConnection.execute('select * from system.nodes');
        await results.getRows();
        await results.close();
        await sleep(60 * 500);
      }
    } catch (e) {
      err = e;
      console.log(e);
    }
    try {
      should.exist(err);
      (err.message.includes('Connection reset by peer') ||
        err.message.includes('connection closed')
      ).should.be.true();
    } catch (e) {
      console.log(e);
    }
    // kill the TE
    try {
      exec('sudo killall tcpkill', {
        setsid: true,
        timeout: 10000
      });
    } catch (e) {
      console.log(e);
    }
    //await sleep(60 * 500);
    stopTE(newTE.startId);
  }).timeout(ERROR_HANDLING_TEST_TIMEOUT);

});
