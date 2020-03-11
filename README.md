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

## Related Links

* [NuoDB Node.js Driver Documentation][3]
* [NuoDB Node.js Driver Docker Sample Express Application][4]

## Examples (EXPERIMENTAL)

See the [examples][30] directory.  Start with
[examples/example.js][31].

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
[30]: https://github.com/nuodb/node-nuodb/blob/master/examples
[31]: https://github.com/nuodb/node-nuodb/blob/master/examples/example.js#L1
[44]: https://github.com/nodejs/abi-stable-node-addon-examples
