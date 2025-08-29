FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV PORT=3008 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 3008
CMD ["node", "index.js"]