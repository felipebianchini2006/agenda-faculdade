FROM crystallang/crystal:latest-alpine

RUN apk add --no-cache postgresql-client openssl-dev yaml-dev zlib-dev

WORKDIR /app/apps/api
COPY apps/api/shard.yml ./
RUN shards install

COPY apps/api ./
EXPOSE 4000

CMD ["crystal", "run", "src/main.cr"]

