# Musubi - Zero Person Company OS
# Docker環境でMusubiが完全な自律性を持つ

FROM node:22-bullseye

# 作業ディレクトリ
WORKDIR /app

# システムパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    curl \
    wget \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Musubiの依存関係をコピー
COPY package*.json ./
COPY musubi-gui/package*.json ./musubi-gui/

# 依存関係をインストール
RUN npm install
RUN cd musubi-gui && npm install

# Musubiのソースコードをコピー
COPY . .

# Musubiの作業ディレクトリを作成
RUN mkdir -p /app/workspace

# ポートを公開
EXPOSE 3001 3002 3003

# 環境変数
ENV NODE_ENV=production
ENV MUSUBI_DOCKER=true

# 起動スクリプト
CMD ["npm", "run", "docker:start"]

