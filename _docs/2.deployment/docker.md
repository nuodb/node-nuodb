---
title: Docker
category: Deployment
order: 1
---

Node NuoDB is distributed as a set of Docker containers. The *node-nuodb* container
is provided as two variants:

* nuodb/node-nuodb:3.3.0-centos
* nuodb/node-nuodb:3.3.0-onbuild

> ONBUILD variants simplify deployment of NuoDB-based applications.

### CentOS

If possible, we recommend using the ONBUILD variants of the Docker containers.

If use of ONBUILD variants is not possible, the following instructions should get
you going with your Node JS project.

To integrate into your project, consider a Docker multi-stage build to promote reduced
image sizes:

1. Set the FROM Dockerfile variable to point at the latest **node-nuodb** Docker
2. Set the NODE_PATH so the Node modules are found.
3. Register the Node modules.

A sample Dockerfile follows:

```Dockerfile
ARG VERSION

FROM nuodb/node-nuodb:${VERSION}-centos

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_PATH /usr/local/lib/node_modules
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
COPY package.json /usr/src/app/
RUN node /usr/src/nuodb/package.json
# RUN npm install && npm cache clean --force
COPY . /usr/src/app

CMD [ "npm", "start" ]
```

### ONBUILD

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
docker run -it --name example --rm --network nuodb-net acme/example:latest
```
