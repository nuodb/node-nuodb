// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { Driver } = require('..');
const config = require('../test/config');

var driver = new Driver();

driver.connect(config)
  .then((conn) => {
    conn.execute('select tablename from system.tables')
      .then((results) => {
        results.getRows()
          .then((rows) => {
            console.log(rows);
          });
      });
  });

// async variation
/*
async function query(conn, sql) {
  let results = await conn.execute(sql);
  return await results.getRows();
}

(async () => {
  let conn = await driver.connect(config);
  let rows = await query(conn, 'select tablename from system.tables');
  console.log(rows);
})()
*/
