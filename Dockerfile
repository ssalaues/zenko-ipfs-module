FROM node:6-slim
MAINTAINER Hanu Prateek Kunduru <hanu.prateek@gmail.com>

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN apt-get update \
    && apt-get install -y jq python git build-essential --no-install-recommends \
    && npm install --production

VOLUME ["/usr/src/app/localData","/usr/src/app/localMetadata"]

CMD [ "npm", "start" ]

EXPOSE 9990
EXPOSE 9991
