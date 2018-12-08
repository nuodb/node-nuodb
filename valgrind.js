// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { Driver } = require('.');
const config = require('./test/config.js');
const http = require('http');

var driver = new Driver();
const port = 3000;

let server = http.createServer(function (request, response) {
  if (request.url === '/') {
    driver.connect(config, function (err, connection) {
      if (err) {
        console.log('failed to create a connection: ' + err);
        return;
      }
      connection.readOnly = true;
      connection.autoCommit = false;
      connection.close(function (err) {
        if (err) {
          console.log('failed to close connection: ' + err);
        }
        response.end('closed connection!');
      });
    });
  }
  if (request.url === '/exit') {
    server.close(function () {
      console.log('server closed!');
      process.exit();
    });
  }
});

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }
  console.log(`server is listening on ${port}`)
})

