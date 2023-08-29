
# Connection Pool

The **NuoDB Node.js** driver comes with a built-in connection pool. A connection pool serves a critical role in optimizing the interaction between applications and databases. 

Unlike establishing an individual connection for each database interaction, a connection pool efficiently manages a reusable collection of established connections. This approach significantly reduces the overhead associated with repeatedly establishing and closing connections, resulting in improved performance and resource utilization. 

With a connection pool in place, the **NuoDB** driver can intelligently manage the lifecycle of connections, offering seamless access to the **NuoDB** database while effectively mitigating the potential for connection bottlenecks and latency. This allows developers to optimize their application's responsiveness and scalability while ensuring an efficient and streamlined interaction with the database.


## Overview

The lifecycle of a connection pool of the `node-nuodb` driver to a **NuoDB** database entails:

- Initialization of the connection `Pool`
- Request connections on the `pool`
- Use the connections
- Release each connection
- Close the `pool`

For simplicity the examples to follow will use `try/catch` semantics, although you `Promise` semantics is also permitted. 

The following is a general example requesting 2 connections on the connection pool. You would in turn manage each connection as a [single connection](./SINGLE_CONNECTION.md#execute-sql).

```js
const connectionConfig = {
    database: `test`,
    password: "dba",
    user: "dba",
    port: "48004",
    schema: "USER"
};

const poolConfig = {
    minAvailable: 10,
    connectionConfig,
    maxAge: 2000,
    checkTime: 10000,
    maxLimit: 12,
    connectionRetryLimit: 5,
};

async function() {
    let pool = null;

    try {
        pool = new Pool(poolConfig);
        const conn1 = await pool.requestConnection();
        const conn2 = await pool.requestConnection();
        // use each connection

        await pool.releaseConnection(conn1);        
        await pool.releaseConnection(conn2);        

    } catch (err) {/* handle error */}

    finally {
        try {
            if (pool != null) {
                await pool.closePool()
            }
        } catch (err) {/* handle error */}
    }
}
```


## Initialize Connection Pool

To initialize a connection pool, you must provide a pool configuration. Please review the shape of the [pool configuration](#pool-configuration) to customize for specific needs. Note, you must specify the [connection configuration](./SINGLE_CONNECTION.md#connection-properties) as for a single connection. After a pool is created the user must initialize it using the `init()` method. This will populate the pool. The pool is unavailable until this completes.

```js
const poolConfig = {
    minAvailable: 10,
    connectionConfig,
    maxAge: 2000,
    checkTime: 10000,
    maxLimit: 12,
    connectionRetryLimit: 5,
};

async function() {
    const pool = new Pool(poolConfig);
    await pool.init()
}
```

## Request Connections

Once the pool has been successfully initialized it is ready for use. There are now free connections that can be requested for use. You can see the pool connections via `pool.all_connections` and `pool.free_connections`.

```js
const conn1 = await Pool.requestConnection();
```

You can request multiple connections this way. Each connection can then be used as a [single connection](./SINGLE_CONNECTION.md#execute-sql) would.

## Release Connections

Once the user has finished using a connection, it can be returned to the pool. You must pass each connection in turn desired to release. Don't forget to manage each single connection's lifecycle properly prior to requesting its release.

```js
await pool.releaseConnection(conn1)
```

Connections that have been released back to the connection pool should not be used anymore. Connections that have failed in any way should be returned to the pool where they will dealt with and replaced.

## Pool Closure

Once the pool has been finished being used, it should be shutdown.

```js
await pool.closePool()
```

This will close all of the connections in the pool regardless of whether or not they are in use.

Users cannot manually close connections provided by the pool, and calling `connection.close()` on a connection provided by the pool will have the same effect as calling `Pool.releaseConnection(connection)`.


## Pool Configuration

```js
{
    minAvailable: number,
    connectionConfig: ConnectionConfig,
    maxAge: number,
    checkTime: number,
    maxLimit: number,
    connectionRetryLimit: number,
    id: number,
    skipCheckLivelinessOnRelease: boolean,
    livelinessCheck: "query"|string
};
```

Key | Value
--- | ---
**connectionConfig** | the configuration that will be used to create the connection in the pool, required argument.
**minAvailable** | initial size of the pool and the number of connections the pool will aim to maintain, default of 10 is used if no argument is provided.
**maxAge** | Amount of time from connection creation until it will age out, default of 300000ms (5 minutes) is used if no argument is provided.
**checkTime** | how often the pool will run an internal liveliness check on free connections, default of 120000ms(2 minutes) is used if no argument is provided. If 0 is provided, the liveliness check will be disabled.
**maxLimit** | hard cap on the amount of live connection the pool can maintain, default of 200 is used if no argument is provided. If 0, the pool will have no hard cap.
**connectionRetryLimit** | amount of times a pool will attempt to create a connection, default of 5 is used if no argument is provided.
**id** | optional argument to give the pool an id. As default the pool will be provided the “new Date().getTime()” at the time of its creation as its id.
**skipCheckLivelinessOnRelease** | turns off liveliness checks on connections when they are released back to the pool, which is different than the checkTime that is used for aging purposes. The default is false, meaning we will perform a liveliness check when a connection is returned to the pool.
**livelinessCheck** | indicates the type of liveliness check to be performed. By default, the value is set to "query", which means a query to test the connection. If set to any value (quoted string) other than "query", it will only look to see if the NuoDB API isConnected returns true and we have not trapped a connection related exception previously.


