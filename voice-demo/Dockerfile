# React をビルドするステージ
FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# ビルドした成果物を Nginx で配信するステージ
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]