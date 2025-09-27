# notify_horse_infos

馬関係の情報を定時実行してSQSに送るスタック

## テスト

### 通常のテスト
```bash
npm test
```

### スナップショットテスト
```bash
# スナップショットテストのみ実行
npm run test:snapshot

# スナップショットを更新
npm run test:update-snapshots
```

スナップショットテストは、CDKスタックの構成が意図せず変更されていないことを確認するために使用されます。スタックの変更を行った場合は、`npm run test:update-snapshots`を実行してスナップショットを更新してください。
