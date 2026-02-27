docker container stop vlend-api
docker container rm vlend-api
docker build -t vlend-api .
docker run -d -p 3000:3000 -e MEGAETH_RPC_URL=https://rpc.megaeth.org -e PORT=3000 --restart=always --name=vlend-api vlend-api
