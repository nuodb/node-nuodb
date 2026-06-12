# Copyright (c) 2018-2019, NuoDB, Inc.
# All rights reserved.
#
# Redistribution and use permitted under the terms of the 3-clause BSD license.

# -------------------------------------
# nuodb image

FROM nuodb/nuodb:latest AS nuodb

# -------------------------------------
# build image

FROM node:22-slim AS build

RUN apt-get -y update && apt-get install -y git gcc g++ make python3 eslint locales

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /src

COPY --from=nuodb /opt/nuodb /src/.nuodb_client_tmp

COPY package.json /src
RUN npm install --ignore-scripts && npm rebuild segfault-handler
RUN node --version

COPY . /src
RUN npm run build

# -------------------------------------
# release image

FROM node:22-slim AS release

COPY --from=build /src/.nuodb_client_tmp/lib64 /opt/nuodb/lib64
COPY --from=build /src /src
