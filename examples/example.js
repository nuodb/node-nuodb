// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

var nuodb = require('../');

var config = {};

config.database = 'test';
config.hostname = 'ad1';
config.port = '48004';
config.user = 'dba';
config.password = 'dba';

nuodb.connect(config, function (err, connection) {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Connection was successful!');

  connection.close(
    function (err) {
      if (err) {
        console.error(err.message);
        return;
      }
    });
});