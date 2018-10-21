
var nuodb = require('../');
var database = new nuodb.Database();

var async = require('async');
var should = require('should');
var config = require('./config.js');

describe('2. close connections', function () {
  it('2.1 can not set property after connection closes', function (done) {
    database.connect(config, function (err, connection) {
      should.not.exist(err);

      connection.release(function (err) {
        should.not.exist(err);
        // verify here that setting a property raises an exception...
        done();
      });
    });
  });
/*
  it('2.2 can not call method, commit()', function (done) {
    database.connect(config, function (err, connection) {
      should.not.exist(err);

      connection.release(function (err) {
        should.not.exist(err);

        connection.commit(function (err) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "NJS-003: invalid connection"
          );
          done();
        });
      });
    }
    );
  }); // 2.2
*/
});
