// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

const { Driver } = require('..');
const nconf = require('nconf');
const args = require('yargs').argv;
const { setTimeout: delay } = require('node:timers/promises');

// Setup order for test parameters and default configuration file
nconf.argv({parseValues:true}).env({parseValues:true}).file({ file: args.config||'../test/config.json' });

var DBConnect = nconf.get('DBConnect');

var driver = new Driver();

(async () => {
  try {
    console.log(Driver.getAsyncJSON());
   } finally {
   }
})();
