'use strict';

const Stream = require('stream')
const Readable = new Stream.Readable()

function ResultStream(result, nuodb) {
  Object.defineProperties(
    self,
    {
      _nuodb: {
        value: nuodb
      },
      _result: {
        value: result,
        writable: true
      },
    }
  );

  // init Readable
  Readable.call(self,
    {
      objectMode: true
    }
  );
}

ResultStream.prototype._read = function (size) {
  var self = this;
}

ResultStream.prototype._close = function () {
  var self = this;
}

util.inherits(ResultStream, Readable);

module.exports = ResultStream;

/*
See:
[1] http://codewinds.com/blog/2013-08-04-nodejs-readable-streams.html
*/
