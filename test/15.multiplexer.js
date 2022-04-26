// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { ShardMultiplexer } = require('..');
const should = require('should');
const config = require('./config');

const POOL_STATE_RUNNING = "running";
const POOL_STATE_CLOSED = "closed";

const defaultShardConfig = {
  id: -1,
  pool_config: {
    minAvailable: 10,
    connectionConfig: config,
    maxAge: 5000,
    checkTime: 60 * 1000,
    maxLimit: 100,
    connectionRetryLimit: 5,
  },
}

const getShardConfig = (shardId) => {
  const shardConfig = {
    ...defaultShardConfig,
    id: shardId
  }
  return shardConfig
}

const initShardMapper = () => {};
const initialShards = [getShardConfig(0), getShardConfig(1), getShardConfig(2), getShardConfig(3)]
const initPoll = async () => {};
const defaultPollInterval = 100;

const multiplexerConfig = {
  shardMapper:initShardMapper,
  shards: initialShards,
  poll:initPoll,
  pollInterval: defaultPollInterval,
}

describe('15. Test Multiplexer', () => {
  let multiplexer;
  before('open connection, init tables', async () => {
    // create the multiplexer and confirm that it is  in the uninitialized state
    multiplexer = new ShardMultiplexer(multiplexerConfig);
    (multiplexer.state).should.be.eql(ShardMultiplexer.STATE_UNINITIALIZED);

    // initialize, and confirm that it is running
    await multiplexer.init();
    (multiplexer.state).should.be.eql(ShardMultiplexer.STATE_RUNNING);

    // confirm that all of the shards/pools are initalized
    multiplexerConfig.shards.forEach( (s) => {
      should.exist(multiplexer.shards[s.id]);
      (multiplexer.shards[s.id].pool.state)
        .should.be.eql(POOL_STATE_RUNNING);
    });
  });

  after('close connection', async () => {
    // maintain a reference to the pools, so we can confirm pool closure
    const pools = Object.keys(multiplexer.shards).map((s) => multiplexer.shards[s].pool);

    // close multiplexer and confirm closure
    await multiplexer.close();
    (multiplexer.state).should.be.eql(ShardMultiplexer.STATE_CLOSED);

    // confirm closure of pools
    pools.forEach( (p) => (p.state).should.be.eql(POOL_STATE_CLOSED));
  });

  it('15.1 Can commission a new shard', async () => {
    const newShardConfig = getShardConfig(Object.keys(multiplexer.shards).length );

    // create a new shard, confirm that it exists and it's pool is running
    try {
      await multiplexer.commissionShard(newShardConfig);
      should.exist(multiplexer.shards[newShardConfig.id]);
      (multiplexer.shards[newShardConfig.id].pool.state).should.be.eql(POOL_STATE_RUNNING);
    } catch (err) {
      should.not.exist(err);
    }

    // confirm that there is an error when tryingg to commission a new shard again
    let e;
    try {
      await multiplexer.commissionShard(newShardConfig);
    } catch (err) {
      e = err;
    }
    should.exist(e);
  });

  it('15.2 Can decommission an existing pool', async () => {

    // confirm that a shard/pool can be successfully decommissioned
    try {
      const pool = multiplexer.shards[0].pool;
      (pool.state).should.be.eql(POOL_STATE_RUNNING);

      await multiplexer.decommissionShard(0);
      (pool.state).should.be.eql(POOL_STATE_CLOSED);
      should.not.exist(multiplexer.shards[0]);
    } catch (err) {
      should.not.exist(err);
    }

    // trying to decommision a shard that's already been decommissioned should throw an error
    let e;
    try {
      await multiplexer.decommissionShard(0);
    } catch (err) {
      e = err
    }
    should.exist(e);
  });
  it('15.3 Can use the poll to make changes to the multiplexer', async () => {
    // confirm that setting the poll to not be a function throws
    let e;
    try {
      multiplexer.poll = 0;
    } catch (err) {
      e = err;
    }
    should.exist(e);

    const successStatus = "success!";
    const failStatus = "new poll function was not called";

    const initialPollFunction = multiplexer.poll;
    const initialShardMapper = multiplexer.shardMapper;

    const pollWillChange = new Promise( (res, rej) => {
      // create a promise that
      // 1.) changes the poll to a function (testPollFunction) which
      // 2.) will in turn change the poll and shard mapper (from the context of a poll initiated by the multiplexer) to a function which
      // 3.) will resolve the promise.

      // if the poll function does not change after 4 iterations of the poll interval, then the promise will reject.
      const rejectTimer = setTimeout(() =>rej(failStatus), 6 * defaultPollInterval);

      // must do this so that the Function object has a different name for comparison
      const testPollFunctionChanged = async (thisArg) => {
        // clear the timeout to prevent error rejecting resolved promise
        clearTimeout(rejectTimer);

        thisArg.poll = async () => {
          // dummy poll to prevent resolving promise again
          // NOTE: do not remove this comment or the test will have a false negative failure.
          // this is a quirk of the should library in version 13.2.3
        }

        // step 3
        res(successStatus);
      }

      const testPollFunction = async (thisArg) => {
        // step 2
        thisArg.poll = testPollFunctionChanged;
        thisArg.shardMapper = () => {
          // dummy shard mapper
          // NOTE: do not remove this comment or the test will have a false negative failure.
        };
      }

      // step 1
      multiplexer.poll = testPollFunction;
    }).then( (r) => {
      (r).should.be.eql(successStatus);
    }).catch((e) => {
      should.not.exist(e);
    });

    await pollWillChange;
    // confirm that after promise resolution the poll function has changed
    (multiplexer.shardMapper).should.not.be.eql(initialShardMapper);
    (multiplexer.poll).should.not.be.eql(initialPollFunction);
  });

  it('15.4 Can use the shard mapper with multiple different sets of arguments', async () => {
    const checkRequestAndRelease = async (requestArgs, expectedShardId) => {
      // keep a reference to thhe free connections
      const initFreeConns = multiplexer.shards[expectedShardId].pool.free_connections.length;
      const conn = await multiplexer.requestConnection(...requestArgs);

      // connection should have a shard id, and the pool should be missing a free conneciton
      (conn.shardId).should.be.eql(expectedShardId);
      (initFreeConns).should.be.eql(multiplexer.shards[expectedShardId].pool.free_connections.length + 1);

      // release the connection
      await multiplexer.releaseConnection(conn);

      // pool should be back to initial number of free connections
      (initFreeConns).should.be.eql(multiplexer.shards[1].pool.free_connections.length);
    }

    // test with no args
    multiplexer.shardMapper = () => 1
    await checkRequestAndRelease([],1);

    // test with 1 arg
    multiplexer.shardMapper = (a) => a
    await checkRequestAndRelease([3],3);

    // test with 2 args
    multiplexer.shardMapper = (a,b) => a - b
    await checkRequestAndRelease([5,3],2);

    // test with 3 args
    multiplexer.shardMapper = (a,b,c) => a + b + c
    await checkRequestAndRelease([0,1,0],1);
  });

});
