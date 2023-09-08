# Copyright (c) 2018-2019, NuoDB, Inc.
# All rights reserved.
#
# Redistribution and use permitted under the terms of the 3-clause BSD license.

# -------------------------------------
# nuodb image

FROM nuodb/nuodb-ce:latest AS nuodb

# -------------------------------------
# build image

FROM node:18-slim AS build

RUN apt-get -y update && apt-get install -y git gcc g++ make python3 eslint

COPY --from=nuodb /opt/nuodb/include /opt/nuodb/include
COPY --from=nuodb /opt/nuodb/lib64 /opt/nuodb/lib64

WORKDIR /src

COPY package.json /src
RUN npm install
RUN node --version

COPY . /src
RUN npm run build

# -------------------------------------
# release image

FROM node:18-slim AS release

COPY --from=build /opt/nuodb/lib64 /opt/nuodb/lib64
COPY --from=build /src /src
