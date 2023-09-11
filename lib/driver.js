// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

require('./logger');

var addon = require('bindings')('nuodb.node');

var Connection = require('./connection')

var assert = require('assert');
var util = require('util');

var SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler("crash.log"); // With no argument, SegfaultHandler will generate a generic log file name

Array.prototype.rotate = (function() {
  var unshift = Array.prototype.unshift, splice = Array.prototype.splice;

  return function(count) {
    var len = this.length >>> 0;
    count = count >> 0;
    unshift.apply(this, splice.call(this, count % len, len));
    return this;
  };
})();

var Driver = function () {
  this._driver = new addon.Driver();
}

Driver.prototype._connect = function () {
  var self = this;
  var args = [].slice.call(arguments);
  assert(args.length > 0);

  // splice args  if first is function, and merge...
  if (args.length > 0 && typeof args[0] === 'function') {
    args.splice(0, 0, {});
  }
  args[0] = self.merge(args[0]);

  // n.b. the original callback is always the first form provided
  var callback = args[1];
  var extension = function (err, instance) {
    if (err) {
      callback(err);
      return;
    }
    assert(instance);
    if (instance) { // neither undefined nor null
      Connection.extend(instance, self);
    }
    callback(null, instance);
  };
  args[1] = extension;
  self._driver.connect.apply(self._driver, args);
}

// This will adorn calls to `connect` with an additional Function;
// the 'promisify function' is last in the list. Therefore, the calls
// to connect will follow these forms:
//
// Promise-based:   [ {}, Function ]
// Async-based:     [ {}, Function, Function ]
Driver.prototype.connect = util.promisify(Driver.prototype._connect);

Driver.prototype.defaults = {
  hostname: 'localhost',
  port: 48004,
  schema: 'USER',
  admin: 'random',
}

Driver.prototype.merge = function (config) {
  var self = this;

  config = config || {};

  function resolve(config, key, override) {
    var value;
    if (override === undefined) {
      value = process.env['NUODB_' + key.toUpperCase()];
    }
    else {
      value = process.env[override];
    }
    return config[key] || value || self.defaults[key];
  }

  config.admin = resolve(config, 'admin');
  config.port = resolve(config, 'port');
  config.hostname = resolve(config, 'hostname');
  config.database = resolve(config, 'database');

  // admin is used to decide what nuoadmin process to use to get a connection
  // unless admin is set to something other than random, then that will be used as a
  // a defauilt, which basically means each connection request will simply rotate the
  // the comma separated list of host[:port] values provided for a connection.
  // The amount of rotation will be based on a random number based on the number of
  // admin servers that can be used to make a connection
  // Ideally we should not have to do this if NuoDB itself took care to spread
  // connection requests across all admin processes.  The as added for
  // defensive purposes.  During 3DMessage testing, thenuoadmin processes crashed
  // when overwhelmed with many simultanous connection requests

  if (config.admin === 'random') {
    var array = config.database.split(",");
    if (array.length > 1) {
      var pick = Math.trunc((Math.random() * (array.length - 1)) + 0.5);
      if (pick > 0) {
        array.rotate(pick);
        config.database = array.toString();
      }
    }
  }

  config.schema = resolve(config, 'schema');
  config.user = resolve(config, 'user');
  config.password = resolve(config, 'password');

  return config;
}

module.exports = Driver;
