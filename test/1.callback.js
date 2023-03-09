// Copyright (c) 2018-2019, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

import { Driver } from '../dist/index.js';
import should from 'should';
import config from './config.js';
describe('1. testing callback', () => {

  var driver = null;

  before('create driver', function () {
    driver = new Driver();
  });

  it('1.1 open and close connections using callbacks', function (done) {
    driver.connect(config, (err, conn) => {
      console.debug('WORKING!!!')
      should.not.exist(err);
      const connection = conn;
      connection.should.be.ok();
      connection.close((err) => {
        should.not.exist(err);
        done();
      })
      connection.should.be.ok();
    })
  });

  it('1.2 can run the sample', function (done) {
    driver.connect(config, (err, conn) => {
      should.not.exist(err);
      const connection = conn;
      connection.should.be.ok();
      connection.execute('SELECT 1 AS VALUE FROM DUAL', (err, results) => {
        should.not.exist(err);
        results.should.be.ok();
        results.getRows((err,rows) => {
          should.not.exist(err);
          rows.should.be.ok();
          connection.close((err) => {
            should.not.exist(err);
            done();
          })
        });
      });
    })
  });
});
