FROM node:6
MAINTAINER Hanu Prateek Kunduru <hanu.prateek@gmail.com>

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN apt-get update \
    && apt-get install -y jq python git build-essential supervisor --no-install-recommends \
    && mkdir -p /var/log/supervisor \
    && npm install --production

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

VOLUME ["/usr/src/app/localData","/usr/src/app/localMetadata"]

EXPOSE 9990
EXPOSE 9991

CMD [ "/usr/bin/supervisord" ]