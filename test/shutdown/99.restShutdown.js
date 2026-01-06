// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

//var should = require('should');
const nconf = require('nconf');
const args = require('yargs').argv;
const { shutdownServer } = require('../../lib/rest');

// Setup order for test parameters and default configuration file
nconf.argv({
  parseValues: true
}).env({
  parseValues: true
}).file({
  file: args.config || 'test/config.json'
});

describe('99. REST shutdown', () => {
  before('invoke shutdown', function() {
  });
  it('99.1 shutdown', function (done) {
    shutdownServer();
    done();
  });
});
