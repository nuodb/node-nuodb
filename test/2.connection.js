// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var {
  Driver
} = require('..');

var should = require('should');
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({
  parseValues: true
}).env({
  parseValues: true
}).file({
  file: args.config || 'test/config.json'
});

var DBConnect = nconf.get('DBConnect');

describe('2. testing connections', function() {
  describe('2a. testing connections state', function() {

    var driver = null;

    before('open connection', function() {
      driver = new Driver();
    });

    it('2a.1 properly opens and releases connections', function(done) {
      driver.connect(DBConnect, function(err, connection) {
        should.not.exist(err);
        connection.close(function(err) {
          should.not.exist(err);
        });
        done();
      });
    });

    it('2a.2 raises an exception if calling method, commit(), after closed', function(done) {
      driver.connect(DBConnect, function(err, connection) {
        should.not.exist(err);
        connection.close(function(err) {
          should.not.exist(err);
          connection.commit(function(err) {
            should.exist(err);
            should.strictEqual(JSON.parse(err.message).Context, "connection closed");
            done();
          });
        });
      });
    });

    it('2a.3 raises an exception if calling method, rollback(), after closed', function(done) {
      driver.connect(DBConnect, function(err, connection) {
        should.not.exist(err);
        connection.close(function(err) {
          should.not.exist(err);
          connection.rollback(function(err) {
            should.exist(err);
            should.strictEqual(JSON.parse(err.message).Context, "connection closed");
            done();
          });
        });
      });
    });

    it('2a.4 raises an exception if calling method, close(), after closed', function(done) {
      driver.connect(DBConnect, function(err, connection) {
        should.not.exist(err);
        connection.close(function(err) {
          should.not.exist(err);
          connection.close(function(err) {
            should.exist(err);
            should.strictEqual(JSON.parse(err.message).Context, "failed to close connection");
            done();
          });
        });
      });
    });

    it('2a.5 raises an exception if calling method, execute(), after closed', function(done) {
      driver.connect(DBConnect, function(err, connection) {
        should.not.exist(err);
        connection.close(function(err) {
          should.not.exist(err);
          connection.execute('SELECT * FROM SYSTEM.CONNECTIONS', function(err, results) {
            should.exist(err);
            should.not.exist(results);
            should.strictEqual(JSON.parse(err.message).Context, "connection closed");
            done();
          });
        });
      });
    });
  });

  describe('2b. setting connection properties', function() {

    var driver = null;
    var connection = null;

    before('open connection', async function() {
      driver = new Driver();
      try {
        connection = await driver.connect(DBConnect);
        connection.should.be.ok();
      } catch (err) {
        should.not.exist(err);
      }
    });

    after(async function() {
      try {
        await connection.close();
        connection.should.be.ok();
      } catch (err) {
        should.not.exist(err);
      }
    });

    var defaultValue;

    describe('2b.1 auto-commit with non-boolean values raises an exception', function() {

      beforeEach('get auto-commit default', function() {
        defaultValue = connection.autoCommit;
      });

      afterEach('reset auto-commit to default', function() {
        connection.autoCommit = defaultValue;
      });

      var setAsGlobalOption = function(setValue, callback) {
        should.throws(
          function() {
            connection.autoCommit = setValue;
          },
          /invalid type in assignment/
        );
        callback();
      };

      it('2b.1.1 Negative - 0', function(done) {
        setAsGlobalOption(0, done);
      });

      it('2b.1.2 Negative - negative number', function(done) {
        setAsGlobalOption(-1, done);
      });

      it('2b.1.3 Negative - positive number', function(done) {
        setAsGlobalOption(1, done);
      });

      it('2b.1.4 Negative - NaN', function(done) {
        setAsGlobalOption(NaN, done);
      });

      it('2b.1.5 Negative - undefined', function(done) {
        setAsGlobalOption(undefined, done);
      });
    });

    describe('2b.2 readonly with non-boolean values raises an exception', function() {

      beforeEach('get readonly default', function() {
        defaultValue = connection.readOnly;
      });

      afterEach('reset readonly to default', function() {
        connection.readOnly = defaultValue;
      });

      var setAsGlobalOption = function(setValue, callback) {
        should.throws(
          function() {
            connection.readOnly = setValue;
          },
          /invalid type in assignment/
        );
        callback();
      };

      it('2b.2.1 Negative - 0', function(done) {
        setAsGlobalOption(0, done);
      });

      it('2b.2.2 Negative - negative number', function(done) {
        setAsGlobalOption(-1, done);
      });

      it('2b.2.3 Negative - positive number', function(done) {
        setAsGlobalOption(1, done);
      });

      it('2b.2.4 Negative - NaN', function(done) {
        setAsGlobalOption(NaN, done);
      });

      it('2b.2.5 Negative - undefined', function(done) {
        setAsGlobalOption(undefined, done);
      });
    });
  });
});
