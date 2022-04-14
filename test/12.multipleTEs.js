// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
var config = require('./config');
var async = require('async');

const getNodeIdQuery = 'SELECT GETNODEID() FROM SYSTEM.DUAL';
const getNodesQuery = 'SELECT * FROM SYSTEM.NODES';

const errTextSystemNotSetup = `The system should have more than 2 nodes (1 SM, 1 TE) to run this test.
  Please ensure that the test environment is properly configured to run this test and try again.`;

const numConnectionsToTest = 20;
const roundRobinDelta = numConnectionsToTest / 5;

const testRepeat = 2;

let nodes = null;

const filterTEOnly = (n) => n.TYPE === "Transaction"
describe('12. Test Connection to multiple TEs', () => {

  var driver = null;
  var connection = null;

  before('open connection, init tables', async () => {
    driver = new Driver();
    connection = await driver.connect(config);
    connection.should.be.ok();

    let err = null;

    try {
      const results = await connection.execute(getNodesQuery);
      results.should.be.ok();
      nodes = await results.getRows();
      (nodes.length).should.be.aboveOrEqual(2, errTextSystemNotSetup);
    } catch (e) {
      err = e
    }

    should.not.exist(err)

  });

  after('close connection', async () => {
    await connection.close();
  });

  it('12.1 Test round robin', async () => {
    let nodeResults = {};
    const connections = [];

    // open up a bunch of connections, and figure ot what node is being connected to
    for(let i = 0; i < numConnectionsToTest; i++){
      const nodeConnection = await driver.connect(config);
      const results = await nodeConnection.execute(getNodeIdQuery);
      const rows = await results.getRows();
      (rows.length).should.be.eql(1);
      const nodeId = rows[0]["[GETNODEID]"];
      await results.close();
      nodeResults[nodeId] = (nodeResults[nodeId] ?? 0) + 1;
      connections.push(nodeConnection);
    }
    // close out those connections
    await async.series(connections.map((c) => async () => {await c.close()}));
    const numTENodes = nodes.filter(filterTEOnly).length;

    // we should have at least one connection to each TE
    (Object.keys(nodeResults).length).should.be.eql(numTENodes);

    // Approximately uniform distribution of connections
    const approxEqual = numConnectionsToTest / numTENodes;
    Object.keys(nodeResults).forEach((k) => {
      (nodeResults[k]).should.be.approximately(approxEqual, roundRobinDelta);
    })

  });

  it('12.2 Test direct connection to multiple TEs', async () => {
    await async.series(
      nodes
        .filter(filterTEOnly)
        .map((n) => async () => {
          // connect to each unique TE directly
          let err = null;
          try {
            const nodeConfig = {... config
              , port: n.PORT
              , direct: "true"};
            const nodeConnection = await driver.connect(nodeConfig);
            nodeConnection.should.be.ok();
            const results = await nodeConnection.execute(getNodeIdQuery);
            const rows = await results.getRows();

            // the connected node should be the same one as specified when opening the connection
            (rows.length).should.be.eql(1);
            (rows[0]["[GETNODEID]"]).should.be.eql(n.ID);

            await nodeConnection.close();
          } catch (e) {
            console.log(e);
            err = e;
          }
          should.not.exist(err);
        })
    );
  });

  it('12.3 Test LBQuery Expression to connect to TEs', async () => {
    await async.series(
      nodes
        .filter(filterTEOnly)
        .map((n) => async () => {
          for(let i = 0; i < testRepeat; i++){
            // connect to each unique TE directly
            let err = null;
            try {
              const nodeConfig = {... config
                , LBQuery: `round_robin(node_id(${n.ID}))`};
              const nodeConnection = await driver.connect(nodeConfig);
              nodeConnection.should.be.ok();
              const results = await nodeConnection.execute(getNodeIdQuery);
              const rows = await results.getRows();

              // the connected node should be the same one as specified when opening the connection
              (rows.length).should.be.eql(1);
              (rows[0]["[GETNODEID]"]).should.be.eql(n.ID);

              await nodeConnection.close();
            } catch (e) {
              console.log(e);
              err = e;
            }
            should.not.exist(err);
          }
        })
    );
  });
});
