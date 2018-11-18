---
title: Transactions
category: Getting Started
order: 5
---

Use options to control commit behavior and isolation level.

> Commit behavior can be configured at the connection or statement level.

By default transactions are not read-only, and auto-commit is enabled; unless
otherwise configured, users should not have to call commit as statements are
committed at the point of execution.

The following shows how to set configure the commit behavior at the connection level,
and manually control transaction boundaries:

```javascript
nuodb.connect(config, function (err, connection) {
  connection.autoCommit = false;   // default true
  connection.readOnly = true;     // default false
  // ...
  connection.commit(function(err) { // only required if autoCommit is set to false
    // ...
    connection.close(function (err) {
      // ...
    });
  });
});

```
