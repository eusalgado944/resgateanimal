FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /app/uploads && chown node:node /app/uploads
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]
