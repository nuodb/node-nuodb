
var nuodb = require('../addon');
var async = require('async');
var should = require('should');
var config = require('./config.js');

describe('2. testing connections', function () {
  it('2.1 properly open and release connections', function (done) {
    nuodb.connect(config, function (err, connection) {
      should.not.exist(err);
      connection.close(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  it('2.2 raises an exception if calling method, commit(), after release', function (done) {
    nuodb.connect(config, function (err, connection) {
      should.not.exist(err);
      connection.close(function (err) {
        should.not.exist(err);
        connection.commit(function (err) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "connection closed or invalid"
          );
          done();
        });
      });
    }
    );
  });
});
