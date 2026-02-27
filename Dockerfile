FROM node:19.3.0

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "app.js"]

# docker build -t vlend-api .
# docker run -d -p 3000:3000 -e MEGAETH_RPC_URL=https://rpc.megaeth.org -e PORT=3000 --restart=always --name=vlend-api vlend-api