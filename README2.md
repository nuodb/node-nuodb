# **node-nuodb** - Node.js NAN C++ NuoDB Driver


The `node-nuodb` add-on for **Node.js** powers high performance **NuoDB** database applications. Use `node-nuodb` to connect **Node.js** to a **NuoDB** database. It supports basic features of the **NuoDB** database and **NuoDB C++** client.


## Dependencies

- Node 16.13.2


## Installation

If you have NuoDB installed locally, skip to step 4.

1. Download the nuodb client package.
   The client package releases can be found here: https://github.com/nuodb/nuodb-client/releases

2. Extract the client package.

   `tar -xzf nuodb-client-version.lin64.tar.gz`

3. Set the `NUODB_CLIENT_PACKAGE` environment variable.
   
   `export NUODB_CLIENT_PACKAGE=/path/to/nuodb-client-version.lin64`

4. Install the driver.
   
   `npm i node-nuodb`   <!--update package name based on final publishing. Possibly will be published with organization prefix, such as @nuodb/node-nuodb-->

5. Ensure the driver is working as intended. Note this assumes NuoDB database has `"dba"` user and `"dba"` as password.
   
   `npm test`

6. Import the driver into your node.js project.
   
   `import { Driver } from "node-nuodb";`


## Single connection

The usage of a single connection entails initializing the driver, connecting to a **NuoDB** database using a configuration object with connection properties, executing desired `SQL`, getting the rows from the result set, and finally closing the connection.   

```js
import { Driver } from "node-nuodb";

const config = {
    database: `test`,
    password: "dba",
    user: "dba",
    port: "48004",
    schema: "USER"
};

async function run() {
    const driver = new Driver();
    const connection = await driver.connect(config);
    const results = await connection.execute("SELECT * FROM SYSTEM.NODES;");
    const rows = await results.getRows();
    await connection.close();
    return rows
}

run()
```

### Connect

To connect to a **NuoDB** database you must provide a configuration object which includes the connection properties. Find the available connection properties in the [NuoDB docs](https://doc.nuodb.com/nuodb/latest/reference-information/connection-properties/#nav-container-toggle). Provide each of the connection property values as a `string`.

```js
const config = {
    database: `test`,
    password: "dba",
    user: "dba",
    port: "48004",
    schema: "USER"
};
```
With the configuration object defined, you can now `connect()` to the desired **NuoDB** database.

```js
const driver = new Driver();
const connection = await driver.connect(config);
```

### Execute SQL
With a connection obtained, `execute()` a `SQL` statement against the database. If the default schema was defined in the configuration map, it is not required to specify which schema the statement is intended to target. `getRows()` to obtain the rows from the result set.

```js
const results = await connection.execute("SELECT * FROM SYSTEM.NODES;");
const rows = await results.getRows();
```

### Close Connection

Finally, `close()` the database connection. 

```js
await connection.close();
```

> **NOTE**
>
> Since the methods are `async`, you should `try catch` them, and may use `await` or `then` as desired. 

### Connection Properties

Key	| Value
---|---
allowSRPFallback=[ true \| false ] | Allows the driver to fall back to SRP if the TLS connection fails (when used in combination with trustStore ). Required (set to true) during rolling upgrade of the security protocol.
ciphers=cipherlist |  Enables the client to provide one or more appropriate ciphers for encrypting the network connection to the database. If this property is not specified the default ciphers AES-256-CTR and RC4 are enabled. The server chooses a preferred cipher from this list. If no matching cipher is found, the connection will be refused. The cipherlist is comma-separated and cipher names are case-sensitive and must be provided exactly as shown. The full list of available ciphers are AES-256-CTR, RC4, and None.
clientInfo=info | Arbitrary information about the connecting client. This is available in the CLIENTINFO column of the SYSTEM.CONNECTIONS and SYSTEM.LOCALCONNECTIONS system tables.
clientProcessID=id | The process ID (pid) of the connecting client. The client may set this property only if not already set by the driver. The .NET and Python drivers set this for the client. The client setting of this property does not overrides the driver setting of this property. The clientProcessId is then available in the CLIENTPROCESSID column of the SYSTEM.CONNECTIONS and SYSTEM.LOCALCONNECTIONS system tables.
direct=[ true \| false ] | Connect directly to TE(s) rather than via the AP(s). If not specified, direct defaults to false and connections are made via the AP(s) specified in the connection URL. When direct=true, the client connection is made directly with a TE. The hosts and port numbers in the connection URL are assumed to specify the hosts and port numbers of TE processes. The use of the direct connection property is supported for nuosql and the JDBC, C, C++, and Go drivers. When using nuosql, it supports an equivalent --direct option. Where possible, direct connection should be made using the load-balancing capability of the APs. This connection property is useful when connecting external SQL applications directly to TEs that are running on a different network - such as in the Cloud, on Kubernetes clusters, and in other containerized deployments (such as Docker) or via SSH tunneling. For more details, see Direct TE Connections. Although it is for JDBC, the basic principles apply to all drivers supporting direct.
idle-timeout=number | The maximum time (in seconds) which indicates how long idle connections are left open. Although the IDLE_CONNECTION_TIMEOUT system property is a global setting for timing out idle connections, you can use this connection property to override the system property on a per connection basis. By default, idle-timeout is set to -1, meaning that the global setting is used. If you set a value greater than 0, this property overrides any value set for IDLE_CONNECTION_TIMEOUT. You may also set a value of 0 to specifically disable this property for the connection. Any time a client connection is terminated for being idle for too long, a message will be logged under the net category. For more information on IDLE_CONNECTION_TIMEOUT, see SQL System Properties.
isolation=level | The default transaction isolation level for the connection to use. Isolation levels supported are consistent_read and read_committed. Note that these values are case sensitive. For more information, see CONSISTENT READ and READ COMMITTED.
keepAlive=[ true \| false ] | Allows enabling of TCP KeepAlive on the connection from client to Transaction Engine. If not specified, keepAlive defaults to false. When keepAlive=true, the driver enables TCP KeepAlive on the socket that it opens to the Transaction Engine. 
LBPolicy=valueA | From the client application, this property allows selective load balancing across Transaction Engines. For information on using LBPolicy, see Load Balancer Policies. 
LBQuery=\<selector>(\<filter>) | From the client application, this property allows selective load balancing across Transaction Engines. For information on using LBQuery, see Load Balancer Policies.
lock-wait-timeout=sec | Configures lock wait time (in seconds) when establishing a new connection. For more information, see About the NuoDB SQL Configuration File. The default is equal to the system property DEFAULT_LOCK_WAIT_TIMEOUT. For more information, see SQL System Properties. 
memory-limit-bytes=size | The memory limit (per connection) in bytes for all blocking SQL engine operations: Hash-grouping, sorting, sorting via priority queue for limit, distinct (via hash-grouping), union, listagg, table functions, and stored procedures returning result set(s) that accumulate data - in main memory. To run statements with a memory limit different from the system-wide limit, start a new connection with this connection property set to the per-connection limit. If you do not define a value for memory-limit-bytes, the value set for the DEFAULT_CONNECTION_MEMORY_LIMIT system property is the default setting used.
password=pwd | The password for the user account used to connect to the database. 
PreferInternalAddress=[ true \| false ] | Use internal address and port for TE, as specified by the external-address and external-port process labels. Default is false (disabled). For a detailed explanation, see Controlling Connectivity, a special case of using Load Balancer Policies with labels. 
rollbackMode=[ procedure \| transaction \| off ] | Controls the behavior of transactions executed inside a stored procedure. The default is off. See About Implicit and Explicit Transactions.
schema=name | The default schema that the connection should use when objects (such as tables and views) are not fully qualified.
TimeZone=timezone | The default time zone for the connection to use (this is also known as the session time zone). If not specified, the application’s default time zone is used.
user=name | The user name for connecting to the database.
verifyHostname=[ true \| false ] | Verifies the DN name of the SSL server against the name presented on the certificate. The default is true.

## Connection Pool

The NuoDB Node.js driver comes with a built in connection pool available.


### Usage

```js
const myPool = new Pool({
    minAvailable: <arg>,
    connectionConfig: <connection config obj>,
    maxAge: <arg>,
    checkTime: <arg>,
    maxLimit: <arg>,
    connectionRetryLimit: <arg>,
    id: <arg>,
    skipCheckLivelinessOnRelease: false|true,
    livelinessCheck: query|<arg>
});
await Pool.init()
const newConnection = await Pool.requestConnection()
await Pool.releaseConnection(<connection>)
await Pool.closePool()

```
```js
const myPool = new Pool({
    minAvailable: <arg>,
    connectionConfig: <connection config obj>,
    maxAge: <arg>,
    checkTime: <arg>,
    maxLimit: <arg>,
    connectionRetryLimit: <arg>,
    id: <arg>,
    skipCheckLivelinessOnRelease: false|true,
    livelinessCheck: query|<arg>
})
```

### Methods

After a pool is created the user must initialize it using the init method:

```js
await Pool.init()
```

This will populate the pool. The pool is unavailable until this completes.

Once the pool has been successfully initialized it is ready for use. The user calls:

```js
const newConnection = await Pool.requestConnection()
```

to get a connection, this method will return a connection ready for use.

Once the user has finished using a connection, it can be returned to the pool with:

```js
await Pool.releaseConnection(<connection>)
```

Connections that have been released back to the connection pool should not be used anymore.
Connections that have failed in any way should be returned to the pool where they will dealt with and replaced.

A pool should be shutdown by calling:

```js
await Pool.closePool()
```

This will close all of the connections in the pool regardless of whether or not they are in use.

Users cannot manually close connections provided by the pool, and calling:
`connection.close()`
on a connection provided by the pool will have the same effect as calling:
`Pool.releaseConnection(connection)`


### Args

**connectionConfig:** the configuration that will be used to create the connection in the pool, required argument.

**minAvailable:** initial size of the pool and the number of connections the pool will aim to maintain, default of 10 is used if no argument is provided.

**maxAge:** Amount of time from connection creation until it will age out, default of 300000ms (5 minutes) is used if no argument is provided.

**checkTime:** how often the pool will run an internal liveliness check on free connections, default of 120000ms(2 minutes) is used if no argument is provided. If 0 is provided, the liveliness check will be disabled.

**maxLimit:** hard cap on the amount of live connection the pool can maintain, default of 200 is used if no argument is provided. If 0, the pool will have no hard cap.

**connectionRetryLimit:** amount of times a pool will attempt to create a connection, default of 5 is used if no argument is provided.

**id:** optional argument to give the pool an id. As default the pool will be provided the “new Date().getTime()” at the time of its creation as its id.

**skipCheckLivelinessOnRelease:** turns off liveliness checks on connections when they are released back to the pool, which is different than the checkTime that is used for aging purposes. The default is false, meaning we will perform a liveliness check when a connection is returned to the pool.

**livelinessCheck:** indicates the type of liveliness check to be performed. By default, the value is set to "query", which means a query to test the connection. If set to any value (quoted string) other than "query", it will only look to see if the NuoDB API isConnected returns true and we have not trapped a connection related exception previously.

Arguments should be provided to the pool as an object. Please refer to the Usage section for an example.

## Related Links

- [NuoDB Multiplexer][5]
- [NuoDB Node.js Driver Documentation][3]

## Best Practices

Any `try` `catch` block in which NuoDB resources are created must be followed by a `finally` block in which NuoDB resources are then cleaned up. Attempting to clean up NuoDB resources in a `try` block can lead to NuoDB resources being created and never cleaned up.

### Good Example

```js
 let conn
 let results
 try {
    conn = await pool.requestConnection();
    results = await conn.execute(query);
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

```js
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
[5]: https://github.com/nuodb/node-multiplexer
