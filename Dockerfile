FROM alpine:3.8
LABEL maintainer="Mathew Moon <me@mathewmoon.net>"


RUN mkdir /app

RUN apk add --no-cache nodejs && \
    apk add --no-cache npm && \
    echo -e "*********************************\n*\tInstalling Express\t*\n*********************************" && \
    cd /app && \
    npm install --no-save express && \
    npm install --no-save body-parser && \
    npm install --no-save aws-sdk

COPY server.js /app/server.js

WORKDIR /app

ENTRYPOINT ["node", "/app/server.js"]