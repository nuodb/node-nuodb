// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var util = require('util');

function close(callback) {
  var self = this;
  self._close(function (err) {
    callback(err);
  });
}

var closePromisified = util.promisify(close);

function getRows() {
  var self = this;
  var args = [].slice.call(arguments);

  var cbIdx = 0;
  do {
    if (typeof args[cbIdx] === 'function') {
      break;
    }
    cbIdx++;
  } while (cbIdx < args.length);
  var callback = args[cbIdx];

  var extension = function (err, instance) {
    if (err) {
      callback(err);
    }
    // add future caching support here... (streams)
    callback(null, instance);
  };
  args[cbIdx] = extension;

  self._getRows.apply(self, args);
}

var getRowsPromisified = util.promisify(getRows);

function extend(resultset, connection, driver) {
  Object.defineProperties(
    resultset,
    {
      _driver: {
        value: driver
      },
      _connection: {
        value: connection
      },
      _close: {
        value: resultset.close
      },
      close: {
        value: closePromisified,
        enumerable: true,
        writable: true
      },
      _getRows: {
        value: resultset.getRows
      },
      getRows: {
        value: getRowsPromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
