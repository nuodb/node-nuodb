
# Single connection

The lifecycle of a single connection of the `node-nuodb` driver to a **NuoDB** database entails:
- Initialization of the `node-nuodb` driver
- Connection to a **NuoDB** database using configuration object
- Execution of desired `SQL`
- Getting the rows from the result set
- Releasing memory
- Closure of the connection

## Overview

The `node-nuodb` driver supports `try/catch`, `callback`, and `Promise` semantics. The following is a general example  implementing the driver. It exemplifies its safe usage via `try/catch` clauses.

> **NOTE**
>
> This example assumes `auto commit` is `on` by default. Set `auto commit` through the connection configuration or `SQL` directive. 

```js
import { Driver } from "node-nuodb";

const config = {
    database: `test`,
    password: "dba",
    user: "dba",
    port: "48004",
    schema: "USER"
};

async function () {
   const driver = new Driver();

   try {
      const connection = await driver.connect(config);
      const results = await connection.execute("SELECT * FROM SYSTEM.NODES;");
      const rows = await results.getRows();
      // use rows

      await rows.close();

   } catch (err) {/* handle error */}

   finally {
      await connection.close();
   }
}
```

### Connect

To connect to a **NuoDB** database you must provide a configuration object which includes the connection properties. Find the available connection properties in the [NuoDB documentation](https://doc.nuodb.com/nuodb/latest/reference-information/connection-properties/#nav-container-toggle). Provide each of the connection property values as a `string`.

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

### Cleanup Memory

Close a results set anytime you are done using any fetch or cursor. This will release memory structures associated with those constructs.  
```js
await rows.close();
```

### Close Connection

Finally, `close()` the database connection. 

```js
await connection.close();
```


### Using callbacks 

The following is an example of creating a single connection against a **NuoDB** database using `callback` semantics. 

```js
let rows;
const driver = new Driver();

driver.connect(config, (err, connection) => {
   if (err) {/* handle connection error */}

   connection.execute("SELECT * FROM SYSTEM.NODES;", (err, results) => {
      if (err) {/* handle execution error */}

      results.getRows((err, rows) => {
         if (err) {/* handle getting rows error */}

         // use rows
      });
   });
   
   connection.close((err) => {
      if (err) {/* handle closure error */}
   });
});
```

### Using Promises 

The following is an example of creating a single connection against a **NuoDB** database using `Promise` semantics. 

```js
let rows;
const driver = new Driver();

driver.connect(config)
   .then(connection => {

      connection.execute("SELECT * FROM SYSTEM.NODES;")
         .then(results => {
            
            results.getRows()
               .then(rows => { /* use rows */ })
               .catch(err => { /* handle getting rows error */ });
            
            results.close()
               .catch(err => { /* handle results closure error */ })
         })
         .catch(err => { /* handle SQL execution error */ });
      
      connection.close()
         .catch(err => { /* handle connection closure error */ })
   
   })
   .catch(err => { /* handle connection error */ }) 
```



## Connection Properties

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


