---
title: Connecting
category: Getting Started
order: 1
---

Connecting to the NuoDB database requires database credentials. These
credentials can be provided using environment variables, or as static
configuration properties.

> Use environment variables to provide credentials to the Docker containers.

To connect to NuoDB using static configuration, with credentials provided
as environment variables, and then close the connection:

```javascript
'use strict';

var { Driver } = require('node-nuodb');

var config = {
  database: 'test',
  hostname: 'ad1',
  port: 48004,
  schema: 'USER',
};

var driver = new Driver();
driver.connect(config, function (err, connection) {
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

To connect to NuoDB using static configuration, and credentials provided
as Javascript variables, and then close the connection:

```javascript
'use strict';

var { Driver } = require('node-nuodb');

var config = {
  ...
  user: 'dba',
  password: 'dba',
  ...
};

driver.connect(config, ...
```

We also support async/await and promise semantics:

```javascript
'use strict';

var { Driver } = require('node-nuodb');
var driver = new Driver();

var config = {
  ...
};

// async/await...
(async () => {
  var connection = await driver.connect(config);
  try {
    ...
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    await connection.close();
  }
})().catch(e => console.log(e.stack));

// promises...
driver.connect(config);
  .then(connection => {
    connection.execute("SELECT 1 FROM DUAL")
      .then(results => {
        results.getRows()
          .then(rows => console.log(rows))
          .catch(e => console.log(e.stack))
      })
      .catch(e => console.log(e.stack()))
  })
  .catch(e => console.log(e.stack()))
```

## Configuration Values

Following is the full list of configuration properties, and their
default values:

| Property  | Type    | Required |  Default  |
| --------- | ------- | -------- | --------- |
| database  | String  | Yes      |           |
| hostname  | String  | No       | localhost |
| port      | Integer | No       | 48004     |
| schema    | String  | No       | USER      |
| user      | String  | Yes      |           |
| password  | String  | Yes      |           |

## Environment Variables

Any of the configuration properties passed to the connect method may
alternatively be specified as environment variables. The variable
names are their upper case equivalent names, with a **NUODB_** common
prefix.
