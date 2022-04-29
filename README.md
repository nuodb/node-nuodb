# node-nuodb

Node.js NAN C++ NuoDB Driver

The node-nuodb add-on for Node.js powers high performance NuoDB Database applications.

Use node-nuodb to connect Node.js 8 and 10 to NuoDB Database.

node-nuodb supports basic features of the NuoDB Database and NuoDB C++ client.

## Installation

The driver is distributed as Dockers; two variants exist, an ONBUILD
variant, and a traditional variant. See the documentation for more
information. We strongly recommend the ONBUILD variant to streamline
build and deployment processes.

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

arguments should be provided to the pool as an object as such:

### Methods

After a pool is created the user must initiate it by using the init method:
`await Pool.init()`
This will populate the pool. The pool is unaivable until this completes.

Once the pool has been successfully initialized it is ready for use. The user uses:
`const newConnection = await Pool.requestConnection()`
to get a connection, this method will return a connection ready for use.

Once the user has finished using a connection, it can be returned to the pool with:
`await Pool.releaseConnection(<connection>)`
Connections that have been released back to the connection should not be used anymore.
Connections that are somehow failing should be returned to the pool where they will dealt with and replaced.

A pool can be shutdown with:
`await Pool.closePool()`
This will close all of the pools connections regardless of weither or not they are in use.

Users cannot manually close connections provided by the pool, and calling:
`connection.close()`
on a connection provided by the pool will have the same effect as calling:
`Pool.releaseConnection(connection)`

### Usage

```
const myPool = new Pool({
    minAvailalbe: <arg>,
    connectionConfig: <connection config obj>,
    maxAge: <arg>,
    checkTime: <arg>,
    maxLimit: <arg>,
    connectionRetryLimit: <arg>,
    id: <arg>
})
```

## Related Links

- [NuoDB Node.js Driver Documentation][3]
- [NuoDB Node.js Driver Docker Sample Express Application][4]

## Examples (EXPERIMENTAL)

See branch [examples](https://github.com/nuodb/node-nuodb/tree/examples).

## Help

Issues and questions about node-nuodb can be posted on [GitHub][2].

## Build and Test

### Dependencies

In order to build the driver you need the following:

- Docker CE (latest)
- GNU Make (to simplify builds)
- JQ (to make sure all version numbers are consistent)
- Git (to download the source)

### Building

GNU make is used to simplify the build process. The Makefile has
comprehensive help built into it:

```bash
$ make help
```

We require a CentOS variant of the official Node JS Docker.
To grab and build the Node JS Docker CentOS image:

```bash
git clone git@github.com:nuodb/docker-node.git
cd docker-node/8/centos/ && docker build -t node:8.12.0-centos .
```

To build and test a `build` Docker image:

```bash
$ make up
$ make status # repeat until the SMs and TEs are up!
$ make test
$ make dn
```

To build a release image for distribution:

```bash
$ make release
```

## Tests

```bash
$ make test
```

## License

This module is released under the [BSD 3-Clause License][1].

[1]: https://opensource.org/licenses/BSD-3-Clause
[2]: https://github.com/nuodb/node-nuodb/issues
[3]: https://nuodb.github.io/node-nuodb/
[4]: https://github.com/nuodb/node-nuodb-demo
[44]: https://github.com/nodejs/abi-stable-node-addon-examples
