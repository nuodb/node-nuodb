'use strict';

const util = require('util');

function connect(params, callback) {
  var self = this;
  self._connect(params, function (err, instance) {
    if (err) {
      callback(err);
    }
    callback(null, instance);
  });
};

var connectPromisify = util.promisify(connect);

function extend(result, nuodb, options) {
  console.log('in result set extends');
  Object.defineProperties(result, {
    _nuodb: {
      value: nuodb
    },
    _cache: {
      value: [],
      writable: true
    },
    rows: {
      value: ['test', 56]
    },
    toReadableStream: {
      value: toReadableStream,
      enumerable: true,
      writable: true
    },
  });
}

module.exports.extend = extend;
