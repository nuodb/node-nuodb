'use strict';

const util = require('util');

function toStream() {
  var self = this;
  var stream;

  if (self._isReading) {
    // error! you cannot start streaming after you've previously started reading
  }

  self._isStream = true;
  stream = new ResultStream(self, self._nuodb);

  return stream
};

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
    toStream: {
      value: toStream,
      enumerable: true,
      writable: true
    },
  });
}

module.exports.extend = extend;
