
# Connection Pool

The **NuoDB Node.js** driver comes with a built-in connection pool. A connection pool serves a critical role in optimizing the interaction between applications and databases. 

Unlike establishing an individual connection for each database interaction, a connection pool efficiently manages a reusable collection of established connections. This approach significantly reduces the overhead associated with repeatedly establishing and closing connections, resulting in improved performance and resource utilization. 

With a connection pool in place, the **NuoDB** driver can intelligently manage the lifecycle of connections, offering seamless access to the **NuoDB** database while effectively mitigating the potential for connection bottlenecks and latency. This allows developers to optimize their application's responsiveness and scalability while ensuring an efficient and streamlined interaction with the database.


## Usage

```js
async function () {
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
}

```

## Methods

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


## Configuration

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


Arguments should be provided to the pool as an object. Please refer to the Usage section for an example.
