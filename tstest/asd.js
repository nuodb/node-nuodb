// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';


const { Pool } = require('..');
var async = require('async');
const should = require('should');
const config = require('../test/config');

const poolArgs = {
  minAvailable: 10,
  connectionConfig: config,
  maxAge: 2000,
  checkTime: 10000,
  maxLimit: 1000,
  connectionRetryLimit: 5,
};

const rand = (max, min) => Math.floor(Math.random() * (max - min)) + min
const randString = (length) => {
  let s = '';
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for(let i = 0; i < length; i++)
    s += charset.charAt(rand(charset.length-1,0))
  return s
}
//!
// const sleep = (ms) => new Promise((res) => {
//   setTimeout(() => res(),ms)
// } );

const mean = (numbers) => numbers.reduce((acc,val)=>(acc+val/numbers.length),0);
const median = (numbers) => {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}
const stddev = (numbers, knownMean=undefined) => {
  const meanVal = knownMean ?? mean(numbers);
  const variance = numbers.reduce((acc,val) => acc + (val-meanVal) ** 2, 0) / (numbers.length - 1)
  return Math.sqrt(variance);
}

const second = 1000;
const minute = 60 * second;

const createTmpTables = [
  'create table if not exists T1 (F1 int)',
  'create table if not exists T2 (F1 STRING)',
  'create table if not exists T3 (F1 BOOLEAN)',
  'create table if not exists T4 (F1 DOUBLE)',
];
const dropTmpTables = [
  'drop table if exists T1',
  'drop table if exists T2',
  'drop table if exists T3',
  'drop table if exists T4',
];

//const selectSysTablesQuery = () => "select * from system.tables order by tablename";
const selectSysTablesQuery = () => "select * from system.tables order by tablename";
const msleep2500Query = () => "select msleep(2500) from dual";
// const selectSysTablesQueryLimit1 = () => "select * from system.tables order by tablename limit 1";
// const selectSysTablesQueryNoRows = () => "select * from system.tables where tablename = 'XXX' order by tablename ";
const longWorkingQuery = () => "select * from system.fields as a inner join system.fields as b on a.field = b.field inner join system.tables on a.schema = tables.schema order by tables.schema limit 100"

const assortedReadQueries = [
  'select * from system.nodes',
  'select * from system.connections',
  'select * from system.fields',
  'select * from system.functions',
  'select * from system.indexes',
  'select * from system.localatoms',
  'select * from system.tables',
  'select * from system.properties',
  'select * from system.querystats',
];

const randomReadQueriesWithWork = () => assortedReadQueries[rand(assortedReadQueries.length-1,0)]

const randomInsertQueries = () => {
  const tableIndex = rand(createTmpTables.length,1);
  let q = null;
  switch(tableIndex) {
  case 1: // int type
    q = `insert into T1 (F1) values (${rand(1000,-1000)})`
    break;
  case 2: // string type
    q = `insert into T2 (F1) values ('${randString(10,2)}')`
    break;
  case 3: // bool
    q = `insert into T2 (F1) values (${rand(1,0)})`
    break;
  case 4: // double
    q = `insert into T2 (F1) values (${rand(100,0)}.${rand(100,0)})`
    break;
  default:
    console.error('Should not get default for random insert query.');
    break;
  }
  return q;
}

const fakeWork = (numberOfOperations, operationalLoad) => new Promise( res => {
  for(let i = 0; i < numberOfOperations; i++){
    const arr = []
    for(let j = 0; j < operationalLoad; j++)
      arr.push(rand(0,1000))
    stddev(arr)
  }

  // we need to let the stack clear and put this in the task queue
  setTimeout(() => res(), 0)
})

//const TEST_CASE_DURATION = 5 * minute;
const TEST_CASE_DURATION = 2 * minute;
const CS_TEST_CASES = [
  {
    description: 'select sys tables',
    concurrency: 100,
    time: TEST_CASE_DURATION,
    getQuery: selectSysTablesQuery,
    expectedResults: {
      totalExpected:28200,
      totalDelta:1000,
      meanExpected:425,
      stdDevExpected:70,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'select sys tables',
    concurrency: 500,
    time: TEST_CASE_DURATION,
    getQuery: selectSysTablesQuery,
    expectedResults: {
      totalExpected:26366,
      totalDelta:1000,
      meanExpected:2297,
      stdDevExpected:500,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'random read',
    concurrency: 100,
    time: TEST_CASE_DURATION,
    getQuery: randomReadQueriesWithWork,
    expectedResults: {
      totalExpected:23826,
      totalDelta:1000,
      meanExpected:504,
      stdDevExpected:74,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'random read',
    concurrency: 500,
    time: TEST_CASE_DURATION,
    getQuery: randomReadQueriesWithWork,
    expectedResults: {
      totalExpected:17907,
      totalDelta:1000,
      meanExpected:3370,
      stdDevExpected:1022,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'random insert',
    concurrency: 100,
    time: TEST_CASE_DURATION,
    getQuery: randomInsertQueries,
    expectedResults: {
      totalExpected:30465,
      totalDelta:1000,
      meanExpected:394,
      stdDevExpected:137,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'random insert',
    concurrency: 500,
    time: TEST_CASE_DURATION,
    getQuery: randomInsertQueries,
    expectedResults: {
      totalExpected:29000,
      totalDelta:1000,
      meanExpected:2077,
      stdDevExpected:992,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'long working',
    concurrency: 100,
    time: TEST_CASE_DURATION,
    getQuery: longWorkingQuery,
    expectedResults: {
      totalExpected:3195,
      totalDelta:1000,
      meanExpected:3769,
      stdDevExpected:943,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'long working',
    concurrency: 500,
    time: TEST_CASE_DURATION,
    getQuery: longWorkingQuery,
    expectedResults: {
      totalExpected:2997,
      totalDelta:1000,
      meanExpected:20695,
      stdDevExpected:6568,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'msleep',
    concurrency: 100,
    time: TEST_CASE_DURATION,
    getQuery: msleep2500Query,
    expectedResults: {
      totalExpected:4716,
      totalDelta:1000,
      meanExpected:2575,
      stdDevExpected:138,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
  {
    description: 'msleep',
    concurrency: 500,
    time: TEST_CASE_DURATION,
    getQuery: msleep2500Query,
    expectedResults: {
      totalExpected:22251,
      totalDelta:1000,
      meanExpected:2726,
      stdDevExpected:400,
    },
    fakeWorkLoad: 100,
    fakeWorkComplexity: 25,
  },
]

const STRESS_TEST_TIMEOUT_BUFFER = TEST_CASE_DURATION / 2 * CS_TEST_CASES.length;
const STRESS_TEST_TIMEOUT = TEST_CASE_DURATION * CS_TEST_CASES.length + STRESS_TEST_TIMEOUT_BUFFER;


const promiseWhile = async (id, condition, action) => {
  while(condition()){
    await action();
  }
}

const runCS = async (pool, query, elapsedTimes) => {
  var results;
  var conn;
  try {
    const start = Date.now();
    conn = await pool.requestConnection();
    results = await conn.execute(query);
    const rows = await results?.getRows();
    rows?.should.be.ok();
    elapsedTimes.push(Date.now() - start);
  } catch (e) {
    console.error(e);
    should.not.exist(e);
  } finally {
    await results?.close();
    await pool.releaseConnection(conn);
  }

}

const CSDriver = async (pool, numCS, timeToRun, getQuery, fakeWorkLoad=0, fakeWorkComplexity=0) => {

  const csPromises = []
  const elapsedTimes = []
  let stop = false;
  let fakeWorkPromise = Promise.resolve();

  for( let i = 0; i < numCS; i++){
    const csPromise = promiseWhile(
      i,
      () => !stop, // don't stop until stop is set to true
      () => runCS(pool, getQuery(), elapsedTimes) // every time the promise resolves, queue up another
    );
    csPromises.push(csPromise);
  }

  if(fakeWorkLoad > 0 && fakeWorkComplexity > 0){
    // if fake work args are passed, run a fake workload in the background
    fakeWorkPromise = promiseWhile(
      0,
      () => !stop,
      () => fakeWork(fakeWorkLoad,fakeWorkComplexity)
    )
  }

  // stop the promise loops after a time, and wait for them all to resolve before continuing.
  setTimeout(() => {
    stop = true;
  }, timeToRun);
  await Promise.all(csPromises);
  await fakeWorkPromise;
  return elapsedTimes;
}

describe('15. Test Performance Under Load', async () => {
  /**
   * to get stats run:
   *  cd /u/users/ecs8/stress-test-mon-logs
   *  nuocmd get stats > $LOG_NAME
   *
   * to upload stats:
   *  nuopython /support/support-utilities/nuodb-dashboards-influx/image/stats_influx.py -o http://nuosup04:8086 $LOG_NAME
   */
  let pool = null;
  let threadCount = process.env.UV_THREADPOOL_SIZE;
  const resultsSummary = [];
  before('init pool, create temp tables', async () => {
    // create the pool
    try{
      pool = new Pool(poolArgs)
      await pool.init();
      const c = await pool.requestConnection();
      for(let i = 0; i < createTmpTables.length; i++)
        await c.execute(createTmpTables[i]);
      await pool.releaseConnection(c);
    } catch (e) {
      should.not.exist(e);
    }

  });

  after('drop temp tables, init pool', async () => {
    try{
      console.table(resultsSummary);
      const c = await pool.requestConnection();
      for(let i = 0; i < dropTmpTables.length; i++)
        await c.execute(dropTmpTables[i]);
      await pool.releaseConnection(c);
      await pool.closePool();
    } catch (e) {
      should.not.exist(e);
    }
  });


  function getMax(arr) {
    let len = arr.length;
    let max = Number.MIN_SAFE_INTEGER;

    while (len--) {
      max = arr[len] > max ? arr[len] : max;
    }
    return max;
  }

  function getMin(arr) {
    let len = arr.length;
    let min = Number.MAX_SAFE_INTEGER;

    while (len--) {
      min = arr[len] < min ? arr[len] : min;
    }
    return min;
  }

  await async.series(CS_TEST_CASES.map((curr, index) => new Promise((res) => {
    const {description, concurrency, time, getQuery,/* expectedResults,*/ fakeWorkLoad, fakeWorkComplexity} = curr;
    const title = `15.${index} Testing ${concurrency} concurrent ${description} requests for ${time/minute} minutes with ${threadCount} threads`;
    describe(title, async () => {
      it(title, async () => {
        let err = null;
        let elapsedTimes = null;
        try {
          // elapsedTimes in ms
          elapsedTimes = await CSDriver(pool, concurrency, time, getQuery, fakeWorkLoad, fakeWorkComplexity);
        } catch (e) {
          err = e;
        }
        should.not.exist(err);

        const totalExecutes = elapsedTimes.length;
        const avgExecTime = mean(elapsedTimes);
        const medianExecTime = median(elapsedTimes);
        const stddevExecTime = stddev(elapsedTimes, avgExecTime);
        const numUpperOutliers = elapsedTimes.reduce((acc,curr) => acc + (curr > avgExecTime + 2 * stddevExecTime ? 1 : 0), 0);
        const numLowerOutliers = elapsedTimes.reduce((acc,curr) => acc + (curr < avgExecTime - 2 * stddevExecTime ? 1 : 0), 0);

        // Unfortunately the min and max functions in the Math modules would blow the stack because of the size of the elapsedTimes array
        // So these functions were replaced with code to get the same values
        // const minExecTime = Math.min(...elapsedTimes);
        // const maxExecTime = Math.max(...elapsedTimes);
        const minExecTime = getMin(elapsedTimes);
        const maxExecTime = getMax(elapsedTimes);

        resultsSummary.push({
          title,
          totalExecutes,
          avgExecTime,
          medianExecTime,
          stddevExecTime,
          numLowerOutliers,
          numUpperOutliers,
          minExecTime,
          maxExecTime
        });

        // compare to historical data
        //(totalExecutes).should.be.aboveOrEqual(expectedResults.totalExpected - expectedResults.totalDelta);
        //(avgExecTime).should.be.belowOrEqual(expectedResults.meanExpected + 2 * expectedResults.stdDevExpected);

        // we should not have a skewed exec time
        //(medianExecTime).should.be.approximately(avgExecTime, stddevExecTime*2);

        // in a normal distribution, 95% of results should fall within 2 stddevs of norm
        //(numUpperOutliers).should.be.belowOrEqual(totalExecutes * 0.25);
        //(numLowerOutliers).should.be.belowOrEqual(totalExecutes * 0.25);

        res();
      }).timeout(TEST_CASE_DURATION + STRESS_TEST_TIMEOUT_BUFFER);
    });
  })));

}).timeout(STRESS_TEST_TIMEOUT);