FROM node:20.18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
CMD ["node", "src/index.js", "src/browser.js"]
