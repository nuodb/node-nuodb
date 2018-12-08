// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var addon = require('bindings')('nuodb.node');

var Connection = require('./connection')

var assert = require('assert');
var util = require('util');

var SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler("crash.log"); // With no argument, SegfaultHandler will generate a generic log file name

var Driver = function () {
  this._driver = new addon.Driver();
}

Object.defineProperties(
  Driver,
  {
    ROWS_AS_ARRAY: {
      value: 0,
      enumerable: true
    },
    ROWS_AS_OBJECT: {
      value: 1,
      enumerable: true
    }
  }
);

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
    }
    Connection.extend(instance, self);
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
  schema: 'USER'
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

  config.hostname = resolve(config, 'hostname');
  config.port = resolve(config, 'port');

  config.database = resolve(config, 'database');
  config.schema = resolve(config, 'schema');

  config.user = resolve(config, 'user');
  config.password = resolve(config, 'password');

  return config;
}

module.exports = Driver;