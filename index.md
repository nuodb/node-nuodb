---
title: Welcome
---

The [node-nuodb][0] add-on for Node.js from [NuoDB][1] powers high performance
NuoDB Database applications. Use node-nuodb to connect Node.js 8 and 10 to
NuoDB Databases.

The add-on has support for connection properties, read-only, auto-commit and
transaction isolation levels; it supports array and JS object based result sets;
it supports async/await, callbacks, and promises; and supports rich type parsing.
And built upon Native Abstractions for Node.js (NAN), it's a portable foundation
for now and future versions of Node.js.

> [Sign up](https://www.nuodb.com/product/evaluate-nuodb) or learn more about NuoDB at [nuodb.com][1].

### Getting Started

Modern applications are increasingly deployed as Docker containers. Supporting
modern application deployment models, the [node-nuodb][0] driver is conveniently
packaged in Docker containers, making it trivial to build and deploy database
applications.

Getting your NuoDB application deployed is as simple as 1-2-3:


1. Create a Dockerfile:
```bash
echo 'ARG VERSION' >> Dockerfile
echo 'FROM nuodb/node-nuodb:${VERSION}-onbuild' >> Dockerfile
```
2. Build a Docker:
```bash
export VERSION=...
docker build --build-arg VERSION=${VERSION} -t acme/example:latest .
```
3. Run your application:
```bash
docker run -it --name example --rm -e NUODB_USER=dba -e NUODB_PASSWORD=dba --network nuodb-net acme/example:latest
```

> Feel free to send us feedback at [Github Issues][2].

[0]: https://github.com/nuodb/node-nuodb
[1]: https://www.nuodb.com
[2]: https://github.com/nuodb/node-nuodb/issues