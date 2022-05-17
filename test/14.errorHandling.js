// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

"use strict";
const { Driver } = require("..");
const {exec} = require("child_process");
const should = require("should");
const config = require("./config");
const http = require("http");

const POLL_RETRY = 5;
const POLL_WAIT = 500;
const postData = {
  engineType: "TE",
  host: "nuoadmin-0",
  dbName: "test",
};
const sleep = (ms) => new Promise((res) => {setTimeout(()=>res(), ms)})
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

const killTE = (pid) =>  new Promise((res,rej) => {
  exec(`kill -9 ${pid}`, (error, stdout,stderr) => {
    res();
  }); 
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

const alterIPTableRules = (source,port,action) => Promise.all([
    new Promise((res) => {
      exec(`iptables -${action} INPUT -p tcp -s ${source} -j DROP ;`, (error,stdout,stderr) => {
        if(error)
          console.error(error)
        if(stderr)
          console.error(error)
    
        res();
      })
    }),
    new Promise((res) => {
      exec(`iptables -${action} OUTPUT -p tcp -s ${source} -j DROP ;`, (error,stdout,stderr) => {
        if(error)
          console.error(error)
        if(stderr)
          console.error(error)
    
        res();
      })
    })
  ])

const netDown = async () => {
  await alterIPTableRules('localhost','8888','I');
}

const netUp = async () => {
  await alterIPTableRules('localhost','8888','D');
}

const netSlow = async () => {
  await new Promise((res) => {
    exec('tc qdisc add dev ens192 root netem delay 60000ms', (e,si,se) => {
      if(e)
        console.error(e);
      if(se)
        console.error(e);
      if(si)
        console.log(si);
      res();
    })

  });
}

const netFast = async () => {
  await new Promise((res) => {
    exec('tc qdisc delete dev ens192 root netem delay 60000ms', (e,si,se) => {
      if(e)
        console.error(e);
      if(se)
        console.error(e);
      if(si)
        console.log(si);
      res();
    })

  });
}

/*
(
  async () => {
    await netUp();
  }
)()
//*/
//*
describe("14. Test errors", () => {
  let driver = null;
  let conn = null;

  before("open connection, init tables", async () => {
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

    await c1.execute("set autocommit off");
    await c2.execute("set autocommit off");

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

  it("14.2 Can detect an index uniqueness error", async () => {
    let err = null;
    try {
      await conn.execute("INSERT INTO T3 VALUES (1)");
      await conn.execute("INSERT INTO T3 VALUES (1)");
    } catch (e) {
      err = e;
      console.error(e);
    }
    should.exist(err);
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
    let rows;
    try {
      results = await directConnection.execute(
        "select getnodeid() from dual"
      );
      rows = await results.getRows();
    } catch (e) {
      err = e;
      console.error(e);
    }
    should.exist(err);

    try {
      await results.close();
      await directConnection.close();
    } catch (e) {
      // do nothing
    }
  });

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
    let rows;
    try {
      results = await directConnection.execute(
        "select getnodeid() from dual"
      );
      await killTE(TEProcData.pid);
      rows = await results.getRows();
    } catch (e) {
      err = e;
      console.error(e);
    }
    should.exist(err);

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
      const rows = await results.getRows();
      await results.close();
    } catch (e) {
      err = e;
      console.error(e);
    }
    await netUp();
    should.exist(err);
    
  });
//*/ 
  it('14.6 Can detect a network timeout on an open connection', async () => {
    console.log("entering 14.6");
    await sleep(2000);
    const conn = await driver.connect(config);
    console.log('connection created');
    await netSlow();
    let err;
    try {
      console.log('net slowed');
      await conn.execute('create table netTest(F1 int)');
      console.log('table created');
      await conn.execute('insert into netTest values (13)');
      const results = await conn.execute('select * from system.nodes');
      const rows = await results.getRows();
      await results.close();
      await conn.execute('drop table netTest');
    } catch (e) {
      err = e;
      console.error(e);
    }
    await netFast();
    should.exist(err);
    
  });
//*/

});
