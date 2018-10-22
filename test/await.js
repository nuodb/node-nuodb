
const nuodb = require('../');
var async = require('async');
var should = require('should');
var config = require('./config.js');

describe('1. testing await', () => {
  it('1.1 open and close connections using async/await', async () => {
    var connection = new nuodb.Connection();
    connection.should.be.ok();
    try {
      await connection.connect(config);
      connection.should.be.ok();
      await connection.release();
      connection.should.be.ok();
    } catch (err) {
      should.not.exist(err);
    }
  });
});
