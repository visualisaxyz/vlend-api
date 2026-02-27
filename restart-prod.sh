docker container stop vlend-api-prod
docker container rm vlend-api-prod
docker build -t vlend-api-prod .
docker run -d -p 3000:3000 -e MEGAETH_RPC_URL=https://rpc.megaeth.org -e PORT=3000 --restart=always --name=vlend-api-prod vlend-api-prod
