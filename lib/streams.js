'use strict';

const Stream = require('stream')
const Readable = new Stream.Readable()

function QueryStream () {
}
class QueryStream extends Readable {
};

module.exports = QueryStream;
