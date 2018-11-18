---
title: Connecting
category: Getting Started
order: 1
---

Connecting to the NuoDB database requires database credentials. These
credentials can be provided using environment variables, or as static
configuration.

> Use environment variables to provide credentials to the Docker containers.

To connect to NuoDB using static configuration, with credentials provided
as environment varaibles, and then close the connection:

```javascript
var nuodb = require('node-nuodb');

var config = {
  database: 'test',
  hostname: 'ad1',
  database: 'test',
  port: '48004',
  schema: 'USER',
};

nuodb.connect(config, function (err, connection) {
  if (err) {
    // handle error
  }
  connection.close(function (err) {
    if (err) {
      // handle error
    }
  });
});
```

To connect to NuoDB using static configuration, and then close the connection:

```javascript
var nuodb = require('node-nuodb');

var config = {
  database: 'test',
  hostname: 'ad1',
  database: 'test',
  port: '48004',
  user: 'dba',
  password: 'dba',
  schema: 'USER',
};

nuodb.connect(config, function (err, connection) {
  if (err) {
    // handle error
  }
  connection.close(function (err) {
    if (err) {
      // handle error
    }
  });
});
```
