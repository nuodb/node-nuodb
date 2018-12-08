# -------------------------------------
# nuodb image

FROM nuodb/nuodb-ce:latest AS nuodb

# -------------------------------------
# build image

FROM node:10-slim AS build

RUN apt-get -y update && apt-get install -y git gcc g++ make python

COPY --from=nuodb /opt/nuodb/include /opt/nuodb/include
COPY --from=nuodb /opt/nuodb/lib64 /opt/nuodb/lib64
RUN rm -f /opt/nuodb/lib64/libNuoODBC.so
RUN rm -f /opt/nuodb/lib64/libNuoRemote.so

WORKDIR /src

COPY package.json /src
RUN npm install --only=production
RUN node --version

COPY . /src
RUN npm run build

# -------------------------------------
# release image

FROM node:10-slim AS release

COPY --from=build /opt/nuodb/lib64 /opt/nuodb/lib64
COPY --from=build /src /src
