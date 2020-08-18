FROM node:13-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . ./

CMD npm run start
