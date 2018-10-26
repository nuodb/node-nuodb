# node-nuodb

Node.js N-API C++ ABI NuoDB Driver

The node-nuodb add-on for Node.js powers high performance NuoDB Database applications.

Use node-nuodb to connect Node.js 8 and 10 to NuoDB Database.

node-nuodb supports basic features of the NuoDB Database and
NuoDB C++ client.

## Installation

## Documentation

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
