---
title: Queries
category: Getting Started
order: 2
---

## General Usage

If your query has no parameters you do not need to specify binding variables
in the execute method:

```javascript

// callback
connection.execute("SELECT 1 FROM DUAL", function (err, results) {
  results.getRows(function (err, rows) {
    if (err) {
      // do something with the error...
      return;
    }
    // do something with the rows...
    results.close(function (err) {
      if (err) {
        // do something with the error...
      }
    });
  });
});

// promise
connection.execute("SELECT 1 FROM DUAL")
  .then(results => {
    results.getRows()
      .then(rows => console.log(rows))
      .catch(e => console.log(e.stack))
  })
  .catch(e => console.log(e.stack())

```

If your query has parameters you need to supply binding variables in the execute method:

```javascript
...
connection.execute("SELECT * FROM MYTABLE WHERE id = ?", [ 54 ], (err, results) => {
  results.getRows(function (err, rows) {
    // ...
    results.close(function (err) {
      ...
    });
  });
});
...
```

## Parameters

The connection class provides an execute method taking the following parameters that
are documented below:

> sql [String], binds [Array], options [Object], callback [Function]

#### sql

> sql[String]
>
> (Required) is the SQL string to be executed by the database.

#### binds

> binds[Array]
>
> (Optional) is an array of variables bound to a parameterized statement. Empty
> arrays are equivalent to omitting binds entirely.

#### options

> options[Object]
>
> (Optional) is an object (hash) of connection and statement options to use while
> executing the SQL string. The valid options are presented below, and their permissible
> values:
>
> **autoCommit**: boolean value, indicating whether each statement is automatically
> committed when execute is called (default = true)
>
> **readOnly**: boolean value, indicating whether to execute the statement in a read-only
> transaction (default = false)
>
> **fetchSize**: positive integer value, indicating the result set batch size when using
> result streaming (default = 1000)
>
> **rowMode**: enumeration value, indicating whether to return results as objects or as
> an array of values (default = Driver.ROWS_AS_ARRAY). Permissible values:
> * Driver.ROWS_AS_ARRAY
> * Driver.ROWS_AS_OBJECT

#### callback

> callback[Function]
>
> (Required) an error-first callback whose second argument is a result set. Not required
> when using promises.

## Special Forms

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
