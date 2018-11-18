---
title: Queries
category: Getting Started
order: 2
---

The connection class provides an execute method taking the following parameters:

> sql[String], params[Array], options[Object], callback[Function]

* sql: SQL string for any DDL or DML
* params: array of SQL parameters, default []
* options: hash of execute options, default {}
  * autoCommit: default is true
  * fetchSize: default is zero (fetch all)
  * readOnly: boolean, default is false
* callback: an error-first callback whose second argument is a result set

> Selecting from DUAL requires explicit column names.

An example of how to perform a simple query against the DUAL table:

```javascript
connection.execute('SELECT 1 AS VALUE FROM DUAL;', [], function (err, results) {
  if (err) {
    // handle error
  }
  console.log(results.rows);
  results.close(function (err) {
    if (err) {
      // handle error
    }
  });
```
