// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

var database = require('nuodb');
var config = require('./config.js');

database.connect(
  {
    user: config.user,
    password: config.password,
    connectString: config.connectString
  },
  function (err, connection) {
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