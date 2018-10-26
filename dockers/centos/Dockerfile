# -------------------------------------
# nuodb image

FROM nuodb/nuodb-ce:latest AS nuodb

# -------------------------------------
# build image

FROM node:8.12.0-centos AS build
#FROM centos/nodejs-8-centos7:latest AS build

RUN yum -y update && yum -y install git gcc gcc-c++ make python

COPY --from=nuodb /opt/nuodb/include /opt/nuodb/include
COPY --from=nuodb /opt/nuodb/lib64 /opt/nuodb/lib64
RUN rm -f /opt/nuodb/lib64/libNuoODBC.so
RUN rm -f /opt/nuodb/lib64/libnuoclient.so

RUN mkdir -p /usr/src/nuodb
WORKDIR /usr/src/nuodb

COPY package.json /usr/src/nuodb
RUN npm install --only=production

COPY . /usr/src/nuodb
RUN npm run build

RUN npm install
RUN npm install -g --unsafe-perm

RUN node --napi-modules addon.js

# -------------------------------------
# release image

#FROM centos/nodejs-8-centos7:latest AS build
FROM node:8.12.0-centos AS release

COPY --from=build /opt/nuodb/lib64 /opt/nuodb/lib64
COPY --from=build /usr/src/nuodb /usr/src/nuodb
COPY --from=build /usr/local/lib/node_modules /usr/local/lib/node_modules

# -------------------------------------
# test image

FROM build AS test

COPY . .

RUN npm run test
