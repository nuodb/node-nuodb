
const nuodb = require('../');
var async = require('async');
var should = require('should');
var config = require('./config.js');

describe('1. testing await', () => {
  it('1.1 open and close connections using async/await', async () => {
    try {
      var connection = await nuodb.connect(config);
      connection.should.be.ok();
      await connection.close();
      connection.should.be.ok();
    } catch (err) {
      should.not.exist(err);
    }
  });
});
