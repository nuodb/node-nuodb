const { ShardMultiplexer }= require('..');
const defaultConnectionConfig = require('../test/config');
const Pool = require('../lib/pool');
const MULTIPLEXER_POLL_INTERVAL = 1000;
const https = require('http');

const getKVStoreValue = (hostname,port,key) => new Promise((res,rej)  => {
  const options = {
    hostname,
    port,
    path: `/api/1/kvstore/${key}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  // handle request response
  const req = https.request(options, (response) => {
    response.on('data', (d) => {
      const responseMessage = JSON.parse(d.toString('utf8'));
      res(responseMessage.value);
    });
  });

  // handle request error
  req.on('error', (e) => {
    rej(e);
  });

  // send request
  req.end();
});


const getLatestNumShards = async () => {
  const HOST = 'localhost';
  const PORT = '8888';
  const KEY = 'numShards';
  try {
    const numShards = await getKVStoreValue(HOST,PORT,KEY);
    return parseInt(numShards);
  } catch (e) {
    console.error(e);
  }
}


const defaultShardConfig = {
  id: -1,
  pool_config: {
    connection_limit: 10,
    connection_config: defaultConnectionConfig,
    max_age: 1000,
    checkTime: 60 * 1000,
    hardLimit: 100,
    connection_retry_limit: 5,
  },
}
const getShardConfig = (shardId) => {
  const shardConfig = {
    ...defaultShardConfig,
    id: shardId,
    pool_config: {
      ...defaultShardConfig.pool_config,
      connection_config: {
        ...defaultConnectionConfig,
        LBQuery: `round_robin(first(label(shard ${shardId})))` 
      }
    }
  }
  return shardConfig
}

const curryShardMapper = (numShards) => (id) => {
  const shard = id % numShards;
  return shard;
}

const curryPoll = (numShards) => async (thisArg) => {
  const latestNumShards = await getLatestNumShards();

  // commission or decommission as needed
  if(latestNumShards < numShards){
    for(let shardId = numShards-1; shardId >= latestNumShards; shardId--){
      console.log(`decomissioning shard ${shardId}`);
      await thisArg.decommissionShard(shardId);
    }
  } else if(latestNumShards > numShards){
    for(let shardId = numShards; shardId < latestNumShards; shardId++){
      console.log(`comissioning shard ${shardId}`);
      await thisArg.commissionShard(getShardConfig(shardId));
    }
  }

  // change the mapper and poll if necessary
  if(latestNumShards != numShards){
    console.log(`shard change from ${numShards} to ${latestNumShards}!`);
    thisArg.shardMapper = curryShardMapper(latestNumShards);
    thisArg.poll = curryPoll(latestNumShards);
  }

}

const getInitialMultiplexerConfig = async () => {
  const numShards = await getLatestNumShards();
  const initialShards = [];

  // create the shard configs
  for(let i = 0; i < numShards; i++){
    const shardConfig = getShardConfig(i);
    initialShards.push(shardConfig);
  }

  return {
    shardMapper: curryShardMapper(numShards),
    shards: initialShards,
    poll: curryPoll(numShards),
    pollInterval: MULTIPLEXER_POLL_INTERVAL
  }
}



const main = async () => {
  const testConnection = async (id) => {
    const conn = await multiplexer.requestConnection(id);
    const results = await conn.execute('select GETNODEID() from dual;');
    const rows = await results.getRows();
    console.log(`rows for pre-mapped id ${id}`);
    console.log(rows);
    results.close();
    multiplexer.releaseConnection(conn);
  }
  const multiplexerConfig = await getInitialMultiplexerConfig();
  const multiplexer = new ShardMultiplexer(multiplexerConfig);
  await multiplexer.init();
  await testConnection(0);
  setInterval(() => {
    try{
      testConnection(0);
    } catch (e) {
      console.error(e.message);
    }
  },3000);
  setInterval(() => {
    try{
      testConnection(1);
    } catch (e) {
      console.error(e.message);
    }
  },3000);
}

main()















