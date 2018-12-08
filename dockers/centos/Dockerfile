# -------------------------------------
# nuodb image

FROM nuodb/nuodb-ce:latest AS nuodb

# -------------------------------------
# build image

FROM node:8.12.0-centos AS build

RUN yum -y update && yum -y install curl git gcc gcc-c++ gdb make python valgrind

COPY --from=nuodb /opt/nuodb/include /opt/nuodb/include
COPY --from=nuodb /opt/nuodb/lib64 /opt/nuodb/lib64
RUN rm -f /opt/nuodb/lib64/libNuoODBC.so
RUN rm -f /opt/nuodb/lib64/libnuoclient.so

RUN mkdir -p /usr/src/nuodb
WORKDIR /usr/src/nuodb

COPY package.json /usr/src/nuodb
RUN npm install --only=production

COPY . /usr/src/nuodb
RUN npm install

# -------------------------------------
# package image: removes any unnecessary artifacts

FROM build AS package

RUN npm install -g --unsafe-perm

RUN npm prune --production
RUN npm dedupe

# -------------------------------------
# release image

FROM node:8.12.0-centos AS release

COPY --from=package /opt/nuodb/lib64 /opt/nuodb/lib64
COPY --from=package /usr/src/nuodb /usr/src/nuodb
COPY --from=package /usr/local/lib/node_modules /usr/local/lib/node_modules
