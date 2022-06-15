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

const second = 1000;
const minute = 60 * second;

const testCase = (concurrency, time) => ({concurrency,time})
const CS_TEST_CASES = [
  testCase(10, 5 * minute),
  testCase(100, 5 * minute),
  testCase(500, 5 * minute),
]

const STRESS_TEST_TIMEOUT_BUFFER = minute * CS_TEST_CASES.length;
const STRESS_TEST_TIMEOUT = 5 * minute * CS_TEST_CASES.length + STRESS_TEST_TIMEOUT_BUFFER;

const CS_QUERY = "select msleep(?) from dual"
const CS_SLEEP_MIN = second;
const CS_SLEEP_MAX = 5 * second;

const promiseWhile = async (id, condition, action) => {
  while(condition()){
    await action();
  }
}

const runCS = async (pool, sleepTime) => {
  const conn = await pool.requestConnection();
  const results = await conn.execute(CS_QUERY, [sleepTime]);
  await results.getRows();
  await results.close();
  await pool.releaseConnection(conn);
}

const CSDriver = async (pool, numCS, timeToRun) => {

  const csPromises = []
  let stop = false;

  for( let i = 0; i < numCS; i++){
    const csPromise = promiseWhile(
      i,
      () => !stop, // don't stop until stop is set to true
      () => runCS(pool, rand(CS_SLEEP_MAX, CS_SLEEP_MIN)) // every time the promise resolves, queue up another
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

  let pool = null;
  before('open connections', async () => {
    // create the pool
    pool = new Pool(poolArgs)
    await pool.init();
  });

  after('close connection', async () => {
    await pool.closePool();
  });

  await async.series(CS_TEST_CASES.map((curr, index) => new Promise((res) => {
    const {concurrency, time} = curr;
    it(`15.${index} Testing ${concurrency} concurrent requests for ${time/minute} minutes`, async () => {
      let err = null;
      try {
        await CSDriver(pool, concurrency, time);
      } catch (e) {
        err = e;
      }
      should.not.exist(err);
      res();
    }).timeout(STRESS_TEST_TIMEOUT);
  })));

}).timeout(STRESS_TEST_TIMEOUT);
