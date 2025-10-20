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
    conn.autoCommit = false;
    conn.execute('select tablename from system.tables')
      .then((results) => {
        results.getRows()
          .then((rows) => {
            console.log(rows);
          });
      });
    conn.commit();
  });

// async variation
async function query(conn, sql, params) {
  let results = await conn.execute(sql,params);
  return await results.getRows();
}

(async () => {
  let conn = await driver.connect(config);
  console.log(conn.autoCommit);
  conn.autoCommit = true;
  console.log(conn.autoCommit);
  await conn.execute("start transaction");
  let results = await conn.execute('select tablename from system.tables limit 2');
  let rows = await results.getRows();
  for (let i = 0; i < rows.length; i++) {
    let results1 = await conn.execute("select field from system.fields where tablename = ? limit 2",[rows[i].TABLENAME]);
    let rows1 = await results1.getRows();
    for (let j = 0; j < rows1.length; j++) {
      console.log(rows[i].TABLENAME,rows1[j].FIELD);
    }
    results1.close();
  }
  results.close();
   conn.commit();
//  await conn.execute("commit");
  console.log(conn.autoCommit);
  conn.close();
})()
