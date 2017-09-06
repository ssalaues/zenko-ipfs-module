FROM node:6.11.2
MAINTAINER Hanu Prateek Kunduru <hanu.prateek@gmail.com>

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN apt-get update \
    && apt-get install -y jq python git build-essential --no-install-recommends \
    && npm install --production

VOLUME ["/usr/src/app/localData"]

CMD [ "npm", "start" ]

EXPOSE 9991
