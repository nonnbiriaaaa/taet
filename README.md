# 健康管理アプリ (Health App)

create_health.py の Excel健康管理ツールをExpo React Nativeでスマホアプリ化したもの。

## 画面構成

| タブ | 画面 | 機能 |
|------|------|------|
| ダッシュボード | index.tsx | KPI表示・体重推移グラフ・13週サマリー |
| 日次記録 | daily.tsx | 体重・食事・運動・睡眠の日次入力 |
| 週次レポート | weekly.tsx | 週別集計・棒グラフ・目標比較 |
| 目標設定 | goals.tsx | 目標体重・期間・1日目標の設定 |

## セットアップ

```bash
npm install
npx expo start
```

QRコードをスマホのカメラ/Expo Goアプリで読み取ると実機確認できます。

## 技術スタック

- Expo SDK 51 + Expo Router (ファイルベースルーティング)
- React Native
- AsyncStorage (ローカルデータ永続化)
- react-native-chart-kit (グラフ)
