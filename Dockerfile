FROM node:24.15-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start","-w","@gatherly/api"]
