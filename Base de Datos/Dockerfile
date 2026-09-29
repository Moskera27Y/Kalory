FROM node:24-alpine
WORKDIR /srv
COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server/index.js server/admin.html ./
ENV PORT=3001
EXPOSE 3001
CMD ["node", "index.js"]
