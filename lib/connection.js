// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var ResultSet = require('./resultset')

var assert = require('assert');
var util = require('util');

function execute() {
  var self = this;
  var args = [].slice.call(arguments);
  assert(args.length > 0);

  // n.b. the original callback is always the first form provided
  var cbIdx = 0;
  do {
    if (typeof args[cbIdx] === 'function') {
      break;
    }
    cbIdx++;
  } while (cbIdx < args.length);
  assert(typeof args[cbIdx] === 'function');
  var callback = args[cbIdx];

  var extension = function (err, instance) {
    if (err) {
      callback(err);
    }
    if (instance) { // neither undefined nor null
      ResultSet.extend(instance, self, self._driver);
    }
    callback(null, instance);
  };
  args[cbIdx] = extension;
  self._execute.apply(self, args);
}

var executePromisified = util.promisify(execute);

function close(callback) {
  var self = this;
  self._close(function (err) {
    callback(err);
  });
}

var closePromisified = util.promisify(close);

function commit(callback) {
  var self = this;
  self._commit(function (err) {
    callback(err);
  });
}

var commitPromisified = util.promisify(commit);

function rollback(callback) {
  var self = this;
  self._rollback(function (err) {
    callback(err);
  });
}

var rollbackPromisified = util.promisify(rollback);

function extend(connection, driver) {
  Object.defineProperties(
    connection,
    {
      _driver: {
        value: driver
      },
      _close: {
        value: connection.close
      },
      close: {
        value: closePromisified,
        enumerable: true,
        writable: true
      },
      _commit: {
        value: connection.commit
      },
      commit: {
        value: commitPromisified,
        enumerable: true,
        writable: true
      },
      _rollback: {
        value: connection.rollback
      },
      rollback: {
        value: rollbackPromisified,
        enumerable: true,
        writable: true
      },
      _execute: {
        value: connection.execute
      },
      execute: {
        value: executePromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
