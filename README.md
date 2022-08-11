# node-nuodb

Node.js NAN C++ NuoDB Driver

The node-nuodb add-on for Node.js powers high performance NuoDB Database applications.

Use node-nuodb to connect Node.js a to NuoDB Database.

node-nuodb supports basic features of the NuoDB Database and NuoDB C++ client.

## Dependencies

Node 16.16.0+

## Installation

If you have NuoDB installed locally, skip to step 4

1. Download the nuodb client package.
   The client package releases can be found here: https://github.com/nuodb/nuodb-client/releases

2. Extract the client package.
   tar -xzf nuodb-client-version.lin64.tar.gz

3. Set the NUODB_CLIENT_PACKAGE environment variable.
   export NUODB_CLIENT_PACKAGE=/path/to/nuodb-client-version.lin64

4. Clone the pre-release nuodb node.js driver from the git repo.
   git clone https://github.com/nuodb/node-nuodb

5. Install the driver.
   cd node-nuodb && npm i
6. Ensure the driver is working as intended (requires NuoDB database running named test with user dba and a password dba).
   npm test

7. Import the driver into your node.js project.
   var Driver = require('/path/to/driver/repo/node-nuodb');

## Documentation

[**Documentation is Available Online!**][3]

# Connection Pool

The NuoDB Node.js driver comes with a built in connection pool available.

### Arguments

**connectionConfig:** the configuration that will be used to create the connection in the pool, required argument.

**minAvailable:** initial size of the pool and the number of connection the pool will aim to maintain, default of 10 is used if no argument is provided.

**maxAge:** Amount of time from connection creation until it will age out, default of 300000ms (5 minutes) is used if no argument is provided.

**checkTime:** how often the pool will run an internal liveliness check on free connections, default of 120000ms(2 minutes) is used if no argument is provided.

**maxLimit:** hard cap on the amount of live connection the pool can maintain, default of 200 is used if no argument is provided. If 0, the pool will have no hard cap.

**connectionRetryLimit:** amount of times a pool will attempt to create a connection, default of 5 is used if no argument is provided.

**id:** optional argument to give the pool an id. As default the pool will be provided the “new Date().getTime()” at the time of its creation as its id.

Arguments should be provided to the pool as an object. Please refer to the Usage section for an example.

### Usage

```
const myPool = new Pool({
    minAvailable: <arg>,
    connectionConfig: <connection config obj>,
    maxAge: <arg>,
    checkTime: <arg>,
    maxLimit: <arg>,
    connectionRetryLimit: <arg>,
    id: <arg>
})
```

### Methods

After a pool is created the user must initiate it by using the init method:

```
await Pool.init()
```

This will populate the pool. The pool is unaivable until this completes.

Once the pool has been successfully initialized it is ready for use. The user uses:

```
const newConnection = await Pool.requestConnection()
```

to get a connection, this method will return a connection ready for use.

Once the user has finished using a connection, it can be returned to the pool with:

```
await Pool.releaseConnection(<connection>)
```

Connections that have been released back to the connection should not be used anymore.
Connections that are somehow failing should be returned to the pool where they will dealt with and replaced.

A pool can be shutdown with:

```
await Pool.closePool()
```

This will close all of the pools connections regardless of weither or not they are in use.

Users cannot manually close connections provided by the pool, and calling:
`connection.close()`
on a connection provided by the pool will have the same effect as calling:
`Pool.releaseConnection(connection)`

## Related Links

- [NuoDB Multiplexer][5]
- [NuoDB Node.js Driver Documentation][3]
- [NuoDB Node.js Driver Docker Sample Express Application][4]

## Examples (EXPERIMENTAL)

See branch [examples](https://github.com/nuodb/node-nuodb/tree/examples).

## Best Practices

Any `try` `catch` block in which NuoDB resources are created must be followed by a `finally` block in which NuoDB resources are then cleaned up. Attempting to clean up NuoDB resources in a `try` block can lead to NuoDB resources being created an never cleaned up.

### Good Example

```
 try {
    const conn = await pool.requestConnection();
    const results = await conn.execute(query);
    const rows = await results?.getRows();
    rows?.should.be.ok();
  } catch (e) {
    console.error(e);
    should.not.exist(e);
  } finally {
      await results?.close();
      await pool.releaseConnection(conn);
  }
```

### Bad Example

```
 try {
    const conn = await pool.requestConnection();
    const results = await conn.execute(query); // if we get an error here we will never clean up our connection
    const rows = await results?.getRows();
    rows?.should.be.ok();
    await results?.close();
    await pool.releaseConnection(conn);
  } catch (e) {
    console.error(e);
    should.not.exist(e);
  }
```

## Help

Issues and questions about node-nuodb can be posted on [GitHub][2].

## License

This module is released under the [BSD 3-Clause License][1].

[1]: https://opensource.org/licenses/BSD-3-Clause
[2]: https://github.com/nuodb/node-nuodb/issues
[3]: https://nuodb.github.io/node-nuodb/
[4]: https://github.com/nuodb/node-nuodb-demo
[5]: https://github.com/nuodb/node-multiplexer
[44]: https://github.com/nodejs/abi-stable-node-addon-examples
