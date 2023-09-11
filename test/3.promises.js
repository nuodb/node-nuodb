// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

var { Driver } = require('..');

var should = require('should');
const nconf = require('nconf');
const args = require('yargs').argv;

// Setup order for test parameters and default configuration file
nconf.argv({parseValues:true}).env({parseValues:true}).file({ file: args.config||'test/config.json' });

var DBConnect = nconf.get('DBConnect');


describe('3. testing promises', function () {

  var driver = null;

  before('create driver', function () {
    driver = new Driver();
  });

  it('3.1 returns a promise from Connection.connect', function (done) {

    var promise = driver.connect(DBConnect);
    promise
      .then(function (connection) {
        connection.should.be.ok();
        connection.close(function (err) {
          if (err) {
            return done(err);
          } else {
            return done();
          }
        });
      })
      .catch(function (err) {
        should.not.exist(err);
        return done();
      });
  });

  it('3.2 returns a promise from connection.close', function (done) {
    driver.connect(DBConnect)
      .then(function (conn) {
        conn.should.be.ok();
        var promise = conn.close();
        return promise;
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        should.not.exist(err);
        return done();
      });
  });

  it('3.2 returns a promise from connection.commit', function (done) {
    driver.connect(DBConnect)
      .then(function (conn) {
        conn.should.be.ok();
        var promise = conn.commit();
        return promise
          .then(function () {
            return conn.close()
              .then(done);
          });
      })
      .catch(function (err) {
        should.not.exist(err);
        return done();
      });
  });

  it('3.2 returns a promise from connection.rollback', function (done) {
    driver.connect(DBConnect)
      .then(function (conn) {
        conn.should.be.ok();
        var promise = conn.rollback();
        return promise
          .then(function () {
            return conn.close()
              .then(done);
          });
      })
      .catch(function (err) {
        should.not.exist(err);
        return done();
      });
  });

  it('3.3 can run the documentation promises sample', function (done) {
    driver.connect(DBConnect)
      .then(connection => {
        connection.execute('SELECT 1 FROM DUAL')
          .then(results => {
            results.getRows(1)
              .then(rows => console.log(rows))
              .catch(e => console.log(e.stack))
          })
          .catch(e => {
            console.log(e.stack());
          });
      })
      .catch(e => {
        console.log(e.stack());
      });
    done();
  });

});
