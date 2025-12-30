// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

const http = require('http');
var express = require('express');
const os = require('os');

process.env.NUODB_NODEJS_REST_PORT = process.env.NUODB_NODEJS_REST_PORT || 9000;
const portVarName = 'NUODB_NODEJS_REST_PORT';
var port = null;

// Check if default port is overriden with an environment variable
if (process.env[portVarName] && process.env[portVarName].trim() !== '') {
  const parsedValue = Number(process.env[portVarName]);
  if (isNaN(parsedValue) || !Number.isInteger(parsedValue)) {
    console.error(`Error: Environment variable ${portVarName} has an invalid integer value: ${process.env[portVarName]}.`);
    process.exit(1);
  }
  port = parsedValue;
}

// Class to create REST Server that can be used in conjuction with Pools to get stats and configuration information
// It relies on the express module for implementation, making it easy to add URL value assignement and processing
// However there seems no easy way to have a graceful shutdown of the express server.  It requires that all
// sockets be tracked so at the point you need the server to be shutdown, all open sockets need to be destroyed
// for the server to completely stop so the surrounding process can exit.
class Rest {
//  static instance = null;

  addInfo(key, sfunc) {
    this.info[key] = sfunc;
  }

  // Code to shutdown server, which requires closing open sockets
  gracefulShutdown() {
    console.log('Shutting down server...');
    //this._express.close();

    // Stop accepting new connections
    this._server.close(() => {
      console.log('HTTP server closed.');
      // Exit process after server is fully closed
      //process.exit(0);
    });

    // Destroy all active sockets after a short delay to allow ongoing requests to finish
    setTimeout(() => {
      console.log('Forcefully closing active connections...');
      for (const socket of this._sockets) {
        socket.destroy(); // Forcefully close the socket
      }
    }, 5000); // 5 seconds grace period
  }

  constructor() {

    this.info = {};
    this.logs = [];
    this.name = 'REST Server';

    process.env.NUODB_NODEJS_REST = process.env.NUODB_NODEJS_REST || 'false';

    if ((process.env.NUODB_NODEJS_REST === 'true') || (process.env.NUODB_NODEJS_REST === '1')) {
      console.log('Starting Express');
      this._express = express();
      this._server = http.createServer(this._express);
      this._server.listen(port, () => console.log(`Driver REST Listening on port ${port}...`));

      // Code to keep track of all sockets that are currently open

      this._sockets = new Set();

      this._server.on('connection', (socket) => {
        this._sockets.add(socket);
        socket.on('close', () => this._sockets.delete(socket));
      });

      // Add all supported URL command paths

      this._express.get('/shutdown', (req, res) => {
        this.gracefulShutdown();
        res.send(JSON.stringify('OK'));
      });

      this._express.post('/shutdown', (req, res) => {
        this.gracefulShutdown();
        console.log('Shutdown request received. Closing server.');
        res.send('Server is shutting down...');
      });

      this._express.get('/info/:key', (req, res) => {
        const key = req.params.key;
        const jsonObject = JSON.parse(this.info[key]());

        // Pretty-format the JSON object with 2 spaces for indentation
        const prettyJsonString = JSON.stringify(jsonObject, null, 2);
        res.send(prettyJsonString);
      });

      this._express.get('/os', (req, res) => {
        res.send((JSON.stringify(getSystemInfo(), null, 2)));
      });

      this._express.get('/env', (req, res) => {
        res.send((JSON.stringify(process.env, null, 2)));
      });
    }
  }
}

function getSystemInfo() {
  const info = {
    timestamp: new Date(),
    os: {
      type: os.type(),
      platform: os.platform(),
      architecture: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: formatUptime(os.uptime())
    },
    user: {
      username: os.userInfo().username,
      homedir: os.homedir(),
      tempdir: os.tmpdir()
    },
    memory: {
      total: formatBytes(os.totalmem()),
      free: formatBytes(os.freemem()),
      usage: `${((1 - os.freemem() / os.totalmem()) * 100).toFixed(2)}%`
    },
    cpu: {
      model: os.cpus()[0].model,
      cores: os.cpus().length,
      speed: `${os.cpus()[0].speed} MHz`
    },
    network: {
      interfaces: os.networkInterfaces()
    }
  };

  return info;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (60 * 60 * 24));
  const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}


// client-shutdown.js
const shutdownServer = async () => {

  process.env.NUODB_NODEJS_REST = process.env.NUODB_NODEJS_REST || 'false';
  process.env.NUODB_NODEJS_REST_PORT = process.env.NUODB_NODEJS_REST_PORT || 9000;

  if ((process.env.NUODB_NODEJS_REST === 'true') || (process.env.NUODB_NODEJS_REST === '1')) {
    const url = `http://localhost:${process.env.NUODB_NODEJS_REST_PORT}/shutdown`;
    try {
      const response = await fetch(url, {
        method: 'POST', // Use the POST method for the shutdown action
        headers: {
          // Add any necessary authorization headers here (omitted for brevity)
          'Content-Type': 'application/json'
        },
        // The body is optional for a simple shutdown trigger
      });

      if (response.ok) {
        const message = await response.text();
        console.log(`Shutdown request successful: ${message}`);
      } else {
        console.error(`Shutdown request failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error making shutdown request:', error.message);
    }
  }
};

const RestSvr = new Rest();

module.exports = { RestSvr: RestSvr, shutdownServer: shutdownServer, };
