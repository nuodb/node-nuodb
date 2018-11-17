'use strict';

var nuodb = require('bindings')('nuodb.node');

const util = require('util');
const connection = require('./connection.js');

function connect(params, callback) {
  var self = this;
  self._connect(params, function (err, instance) {
    if (err) {
      callback(err);
    }
    connection.extend(instance, self);
    callback(null, instance);
  });
};

var connectPromisify = util.promisify(connect);

function extend(nuodb) {
  Object.defineProperties(nuodb, {
    ROWS_AS_ARRAY: {
      value: 0,
      enumerable: true
    },
    ROWS_AS_OBJECT: {
      value: 1,
      enumerable: true
    },
    _connect: {
      value: nuodb.connect
    },
    connect: {
      value: connectPromisify,
      enumerable: true,
      writable: true
    },
  });
}

extend(nuodb);
module.exports = nuodb;