@echo off
cd /d "e:\work\taet"

if not exist "node_modules" (
    echo 初回セットアップ中...
    call npm install
)

echo 健康管理アプリを起動中...
start "" http://localhost:8081
npx expo start --web
