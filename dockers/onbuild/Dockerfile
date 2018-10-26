ARG VERSION

FROM nuodb/node-nuodb:${VERSION}-centos

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ONBUILD ENV NODE_PATH /usr/local/lib/node_modules
ONBUILD ARG NODE_ENV
ONBUILD ENV NODE_ENV $NODE_ENV
ONBUILD COPY package.json /usr/src/app/
ONBUILD RUN node --napi-modules /usr/src/nuodb/package.json
# ONBUILD RUN npm install && npm cache clean --force
ONBUILD COPY . /usr/src/app

CMD [ "npm", "start" ]