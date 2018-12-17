// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
var config = require('./config.js');

describe('2. testing connections', function () {

  var driver = null;

  before('open connection', function () {
    driver = new Driver();
  });

  it('2.1 properly opens and releases connections', function (done) {
    driver.connect(config, function (err, connection) {
      should.not.exist(err);
      connection.close(function (err) {
        should.not.exist(err);
      });
      done();
    });
  });

  it('2.2 raises an exception if calling method, commit(), after close', function (done) {
    driver.connect(config, function (err, connection) {
      should.not.exist(err);
      connection.close(function (err) {
        should.not.exist(err);
        connection.commit(function (err) {
          should.exist(err);
          should.strictEqual(err.message, "connection closed");
          done();
        });
      });
    }
    );
  });

  it('2.3 setting auto-commit', function () {
    driver.connect(config, function (err, connection) {
      should.not.exist(err);

      describe('2.3.1 with non-boolean values raises an exception', function () {

        var defaultValue;

        beforeEach('get auto-commit default', function () {
          defaultValue = connection.autoCommit;
        });

        afterEach('reset auto-commit to default', function () {
          connection.autoCommit = defaultValue;
        });

        var setAsGlobalOption = function (setValue, callback) {
          should.throws(
            function () {
              connection.autoCommit = setValue;
            },
            /invalid type in assignment/
          );
          callback();
        };

        it('2.3.1 Negative - 0', function (done) {
          setAsGlobalOption(0, done);
        });

        it('2.3.2 Negative - negative number', function (done) {
          setAsGlobalOption(-1, done);
        });

        it('2.3.3 Negative - positive number', function (done) {
          setAsGlobalOption(-1, done);
        });

        it('2.3.4 Negative - NaN', function (done) {
          setAsGlobalOption(NaN, done);
        });

        it('2.3.5 Negative - undefined', function (done) {
          setAsGlobalOption(undefined, done);
        });
      });

      after(function () {
        connection.close(function (err) {
          should.not.exist(err);
        });
      })
    });
  });

  it('2.4 setting read-only', function () {
    driver.connect(config, function (err, connection) {
      should.not.exist(err);

      describe('2.4.1 with non-boolean values raises an exception', function () {

        var defaultValue;

        beforeEach('get read-only default', function () {
          defaultValue = connection.readOnly;
        });

        afterEach('reset read-only to default', function () {
          connection.readOnly = defaultValue;
        });

        var setAsGlobalOption = function (setValue, callback) {
          should.throws(
            function () {
              connection.readOnly = setValue;
            },
            /invalid type in assignment/
          );
          callback();
        };

        it('2.4.1.1 Negative - 0', function (done) {
          setAsGlobalOption(0, done);
        });

        it('2.4.1.2 Negative - negative number', function (done) {
          setAsGlobalOption(-1, done);
        });

        it('2.4.1.3 Negative - positive number', function (done) {
          setAsGlobalOption(-1, done);
        });

        it('2.4.1.4 Negative - NaN', function (done) {
          setAsGlobalOption(NaN, done);
        });

        it('2.4.1.5 Negative - undefined', function (done) {
          setAsGlobalOption(undefined, done);
        });
      });

      after(function () {
        connection.close(function (err) {
          should.not.exist(err);
        });
      })
    });
  });
});