'use strict';

const util = require('util');
const resultset = require('./resultset.js');

function execute() {
  var self = this;
  var args = [].slice.call(arguments).slice(0, -1);
  var callback = args[args.length - 1];
  var options = args.length === 4 ? args[args.length - 2] : {};

  var extension = function (err, result) {
    if (err) {
      callback(err);
    }
    resultset.extend(result, self._nuodb, options);
    callback(null, result);
  };
  args[args.length - 1] = extension;

  self._execute.apply(self, args);
}

var executePromisify = util.promisify(execute);

function extend(connection, nuodb) {
  Object.defineProperties(connection, {
    _nuodb: {
      value: nuodb
    },
    _execute: {
      value: connection.execute
    },
    execute: {
      value: executePromisify,
      enumerable: true,
      writable: true
    },
  });
}

module.exports.extend = extend;
