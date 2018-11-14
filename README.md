# node-nuodb

Node.js N-API C++ ABI NuoDB Driver

The node-nuodb add-on for Node.js powers high performance NuoDB Database applications.

Use node-nuodb to connect Node.js 8 and 10 to NuoDB Database.

node-nuodb supports basic features of the NuoDB Database and
NuoDB C++ client.

## Installation

## Documentation

## Related Links

1. [Node Addon C++ API][40]
2. [Node Addon C++ API (Github Project)][41]
2. [Node ABI (N-API) Documentation][42]
3. [Node ABI (N-API) Github Project)][43]
4. [Node ABI Stable Examples (Github Project)][44]

## Examples

See the [examples][30] directory.  Start with
[examples/example.js][31].

## Help

Issues and questions about node-nuodb can be posted on [GitHub][3].

## Build and Test

### Dependencies

In order to build the driver you need the following:

- Docker CE (latest)
- GNU Make (to simplify builds)
- JQ (to make sure all version numbers are consistent)
- Git (to download the source)

### Building

#### Prerequisite

In order to build and test, you MUST have built from [docker-node][45] a
CentOS based Node JS Docker.

#### Targets

GNU make is used to simplify the build process. The following table details
the makefile targets available:

| Target  	|  Description 	|  Applicability 	|
|---	|---	|---	|
|  clean  |  Cleans up any build artifacts 	|  Build and test   |
|  all	|  Runs the `clean` and `release` targets 	|  Build and release 	|
|  version 	|  Displays the current release version (see package.json) 	|  Used as the version for Dockers and NPM packages   |
|  build 	|  Creates a `build` Docker image variant 	|  Debugging / Testing  	|
|  release	|  Creates a `release` Docker image 	|  Distribution to customers   |
|  onbuild 	|  Creates an `ONBUILD` Docker image variant 	|  Distribution to customers for application integration and development 	|
|  example 	|  Creates an `example` Docker image based upon `ONBUILD` 	|  Example integration for customers 	|
|  run-build 	|  Runs the `build` Docker variant 	|  Debugging 	|
|  run-example 	|  Runs the `example` Docker variant 	|  Show a demo 	|
|  up 	|  Starts up a NuoDB cluster 	|  Debug and test 	| 
|  status 	|  Shows the NuoDB cluster status 	|  Debug and test 	|
|  dn 	|  Stops the NuoDB cluster 	|  Debug and test 	|

We require a CentOS variant of the official Node JS Docker.
To grab and build the Node JS Docker CentOS image:

```bash
git clone git@github.com:nuodb/docker-node.git
cd docker-node/8/centos/ && docker build -t node:8.12.0-centos .
```
#### Steps

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

To run the test suite see [test/README][34].

## License

This module is released under the [MIT License][36].

[3]: https://github.com/nuodb/node-nuodb/issues
[30]: https://github.com/nuodb/node-nuodb/blob/master/examples
[34]: https://github.com/nuodb/node-nuodb/blob/master/test/README.md
[36]: https://opensource.org/licenses/MIT
[31]: https://github.com/nuodb/node-nuodb/blob/master/examples/example.js#L1
[40]: https://github.com/nodejs/node-addon-api#api
[41]: https://github.com/nodejs/node-addon-api
[42]: https://nodejs.org/api/n-api.html
[43]: https://github.com/nodejs/node/blob/master/doc/api/n-api.md
[44]: https://github.com/nodejs/abi-stable-node-addon-examples
[45]: https://github.com/nuodb/docker-node/tree/master/8/centos