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

## Tests

To run the test suite see [test/README][34].

## Build and Test

To build and test a "build" Docker image:

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

## License

This module is released under the [MIT License][36].

[3]: https://github.com/nuodb/node-nuodb/issues
[30]: https://github.com/nuodb/node-nuodb/blob/master/examples
[34]: https://github.com/nuodb/node-nuodb/blob/master/test/README.md
[36]: https://opensource.org/licenses/MIT
[31]: https://github.com/nuodb/node-nuodb/blob/master/examples/example.js#L1