# **node-nuodb** - Node.js NAN C++ NuoDB Driver

The `node-nuodb` add-on for **Node.js** powers high performance **NuoDB** database applications. Use `node-nuodb` to connect **Node.js** to a **NuoDB** database. It supports basic features of the **NuoDB** database and **NuoDB C++** client.

Uilizing the **NuoDB** **Node.js** driver allows developers to harness NuoDB's distributed architecture and dynamic scaling, while benefiting from **Node.js**' ease. This guide will help you set up, configure, and use the driver to connect seamlessly to a **NuoDB** database, empowering your applications to integrate smoothly with its advanced database technology.


## Dependencies

- Node 16.13.2


## Installation

**NuoDB** has been designed for gradual adoption from the start, and you can use as little or as much of its capabilities as you need. To connect to a **NuoDB** database, you need to have **NuoDB** installed first. 

> **NOTE** -
> If you have **NuoDB** installed locally, skip to step 4.

1. Download the **NuoDB** client package.
   The client package releases can be found here: https://github.com/nuodb/nuodb-client/releases

2. Extract the client package.

   `tar -xzf nuodb-client-version.lin64.tar.gz`

3. Set the `NUODB_CLIENT_PACKAGE` environment variable.
   
   `export NUODB_CLIENT_PACKAGE=/path/to/nuodb-client-version.lin64`

4. Install the driver.
   
   `npm i node-nuodb`   <!--update package name based on final publishing. Possibly will be published with organization prefix, such as @nuodb/node-nuodb-->

5. Ensure the driver is working as intended. Note, this assumes **NuoDB** database has `"dba"` user and `"dba"` as password.
   
   `npm test`

6. Import the driver into your **Node.js** project.
   
   `import { Driver } from "node-nuodb";`

## Documentation

<!-- Check out the Getting Started page for a quick overview. -->
`node-nuodb` driver enables the capability of connection to a **NuoDB** database via a single connection or a connection pool. For further details refer to the best practices section.

- [Single Connection](SINGLE_CONNECTION.md)
- [Connection Pool](CONNECTION_POOL.md)
- [Best Practices](BEST_PRACTICES.md)

For information on using NuoDB, refer to the [documentation website](https://doc.nuodb.com/nuodb/latest/introduction-to-nuodb/).

## Help

Issues and questions about node-nuodb can be posted on [GitHub](https://github.com/nuodb/node-nuodb/issues).

## License

This package is released under the [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause).

<!-- [5]: https://github.com/nuodb/node-multiplexer -->