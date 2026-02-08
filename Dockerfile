# 构建前端
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 生产环境
FROM node:20-alpine
WORKDIR /app

# 安装 ffmpeg 用于音频格式转换
RUN apk add --no-cache ffmpeg

COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY server/ ./server/
COPY --from=frontend-build /app/client/dist ./client/dist

# 有声书存放目录（通过docker volume挂载）
VOLUME ["/audiobooks"]

ENV NODE_ENV=production
ENV AUDIOBOOK_PATH=/audiobooks
ENV PORT=4001

EXPOSE 4001

CMD ["node", "server/index.js"]
