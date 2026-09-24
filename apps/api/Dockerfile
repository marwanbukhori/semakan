FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contract/package.json packages/contract/
COPY packages/domain/package.json packages/domain/
COPY packages/seed/package.json packages/seed/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @semakan/api --include-workspace-root=false
COPY packages packages
COPY apps/api apps/api
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--import", "@swc-node/register/esm-register", "src/main.ts"]
