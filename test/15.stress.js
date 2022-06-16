// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';


const { Pool } = require('..');
var async = require('async');
const should = require('should');
const config = require('./config');

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
const sleep = (ms) => new Promise((res) => {
  setTimeout(() => res(),ms)
} );

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


const selectSysTablesQuery = () => "select * from system.tables order by tablename";
const msleep2500Query = () => "select msleep(2500) from dual";
const selectSysTablesQueryLimit1 = () => "select * from system.tables order by tablename limit 1";
const selectSysTablesQueryNoRows = () => "select * from system.tables where tablename = 'XXX' order by tablename ";
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


const testCase = (description, concurrency, time, getQuery) => ({description, concurrency,time, getQuery})
const CS_TEST_CASES = [
  testCase('random insert', 100, 5 * minute, longWorkingQuery),
  testCase('random insert', 500, 5 * minute, longWorkingQuery),
  // testCase('random read', 100, 5 * minute, randomReadQueriesWithWork),
  // testCase('random read', 500, 5 * minute, randomReadQueriesWithWork),
]

const STRESS_TEST_TIMEOUT_BUFFER = 2 * minute * CS_TEST_CASES.length;
const STRESS_TEST_TIMEOUT = 5 * minute * CS_TEST_CASES.length + STRESS_TEST_TIMEOUT_BUFFER;


const promiseWhile = async (id, condition, action) => {
  while(condition()){
    await action();
  }
}

const runCS = async (pool, query) => {
  try {
    const conn = await pool.requestConnection();
    const results = await conn.execute(query);
    const rows = await results?.getRows();
    rows?.should.be.ok();
    await results?.close();
    await pool.releaseConnection(conn);
  } catch (e) {
    should.not.exist(e);
    console.error(e);
  }
}

const CSDriver = async (pool, numCS, timeToRun, getQuery) => {

  const csPromises = []
  let stop = false;

  for( let i = 0; i < numCS; i++){
    const csPromise = promiseWhile(
      i,
      () => !stop, // don't stop until stop is set to true
      () => runCS(pool, getQuery()) // every time the promise resolves, queue up another
    );
    csPromises.push(csPromise);
  }

  // stop the promise loops after a time, and wait for them all to resolve before continuing.
  setTimeout(() => {
    stop = true;
  }, timeToRun);
  await Promise.all(csPromises);
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
      const c = await pool.requestConnection();
      for(let i = 0; i < dropTmpTables.length; i++)
        await c.execute(dropTmpTables[i]);
      await pool.releaseConnection(c);
      await pool.closePool();
    } catch (e) {
      should.not.exist(e);
    }
  });

  await async.series(CS_TEST_CASES.map((curr, index) => new Promise((res) => {
    const {description, concurrency, time, getQuery} = curr;
    const title = `15.${index} Testing ${concurrency} concurrent ${description} requests for ${time/minute} minutes with ${threadCount} threads`;
    describe(title, async () => {
      it(title, async () => {
        let err = null;
        try {
          await CSDriver(pool, concurrency, time, getQuery);
        } catch (e) {
          err = e;
        }
        should.not.exist(err);
        await sleep(30 * second);
        res();
      }).timeout(STRESS_TEST_TIMEOUT);
    });
  })));

}).timeout(STRESS_TEST_TIMEOUT);
