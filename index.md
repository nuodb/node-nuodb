---
title: Welcome
---

The [node-nuodb][0] add-on for Node.js from [NuoDB][1] powers high performance NuoDB Database applications.
Use node-nuodb to connect Node.js 8 and 10 to NuoDB Databases.

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

### Features

Explore more of *node-nuodb* by reading about our features:

#### Scalable

Just as with the database, the [node-nuodb][0] driver scales to handle large result set sizes
with result set streaming.

#### Container-based

Distributed as two Docker variants, increase developer productivity, and accelerate your
proliferation of value.

#### Open Source

Entirely Open Source, feel free to inspect, modify or contribute to [the project][0].

#### Proven Foundation

Written using the Node NAN API, the driver supports Node JS 8 and newer.

[0]: https://github.com/nuodb/node-nuodb
[1]: https://www.nuodb.com
[2]: https://github.com/nuodb/node-nuodb/issues