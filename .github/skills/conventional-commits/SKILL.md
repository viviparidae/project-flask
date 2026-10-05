---
name: "Conventional Commits"
description: "Commit message conventions that keep history readable, traceable, and consistent with release and review workflows."
---

# Conventional Commits

## 目的

コミットメッセージは、変更内容を簡潔かつ機械的に理解できるようにし、履歴の追跡とリリース管理を容易にする。

## 基本ルール

- コミットメッセージは Conventional Commits 形式に従う。
- 形式は `type(scope): subject` とする。
- `type` は以下のいずれかを使用する。
  - `feat`: 新機能追加
  - `fix`: バグ修正
  - `docs`: ドキュメント更新
  - `refactor`: 振る舞いを変えないリファクタリング
  - `test`: テスト追加・修正
  - `chore`: ビルド、設定、雑務
  - `perf`: 性能改善
  - `style`: コード整形のみ
  - `ci`: CI 設定変更
- `scope` は必要に応じて使用する。例: `api`, `ui`, `docs`, `auth`
- `subject` は命令形ではなく、簡潔な日本語または英語で書く。
- 本文は必要に応じて追加し、変更理由や影響範囲を記載する。

## 例

- `feat(api): add user login endpoint`
- `fix(ui): correct reset button behavior`
- `docs(readme): update setup instructions`
- `refactor(domain): extract simulation logic`
- `test(requirements): add validation cases`
- `chore(ci): update lint workflow`

## 禁止事項

- 変更内容が分からない曖昧なメッセージを使わない
- `fix` なのに新機能を混ぜない
- `wip`, `tmp`, `test123` のような意味不明なメッセージを使わない
- 1 コミットに複数の責務を混在させない

## 実務上の運用

- 1 つのコミットには 1 つの主目的だけを持たせる
- 規模が大きい変更は、関連する複数コミットに分割する
- 変更が要件や設計に影響する場合は、コミットメッセージに関連する要求や要件 ID を補足できるようにする
- PR や issue と関連付ける場合は、本文に参照先を記載する

### 本文付きコミットの例

```text
feat(simulation): add population growth rule

- add reproduction rate calculation
- update ecosystem state transition
- preserve deterministic behavior for tests
```

## まとめ

コミットメッセージは「誰が見ても何をしたかが分かる」ものにし、履歴から変更理由と影響範囲を追跡できるようにする。
