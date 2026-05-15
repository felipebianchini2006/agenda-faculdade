FROM crystallang/crystal:latest-alpine

RUN apk add --no-cache postgresql-client openssl-dev yaml-dev zlib-dev

WORKDIR /app/apps/api
COPY apps/api/shard.yml ./
RUN shards install

COPY apps/api ./
RUN mkdir -p bin && \
    crystal build --release src/main.cr -o bin/agenda-api && \
    crystal build --release src/worker.cr -o bin/agenda-worker
EXPOSE 4000

CMD ["./bin/agenda-api"]

