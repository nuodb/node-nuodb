
const nuodb = require('../');
const util = require('util');
var async = require('async');
var should = require('should');
var config = require('./config.js');

describe('3. promises.js', function () {
  it('16.1 returns a promise from Connection.connect', function (done) {
    var connection = new nuodb.Connection();
    connection.connect(config)
      .then(function (connection) {
        connection.should.be.ok();
        connection.release(function (err) {
          should.not.exist(err);
          // verify here that setting a property raises an exception...
          return done();
        });
      })
      .catch(function (err) {
        console.log(err);
        should.not.exist(err);
        return done();
      });
  });
});