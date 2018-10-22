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

WORKDIR /src

COPY package.json /src
RUN npm install -g node-gyp && npm install --only=production

COPY . /src
RUN npm run build

RUN npm install && find .
RUN npm run test

RUN node --napi-modules addon.js

# -------------------------------------
# release image

#FROM centos/nodejs-8-centos7:latest AS build
FROM node:8.12.0-centos AS release

COPY --from=build /opt/nuodb/lib64 /opt/nuodb/lib64
COPY --from=build /src /src
