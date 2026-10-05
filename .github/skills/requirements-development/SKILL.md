---
name: "Requirements Development"
description: "Rules for writing behavior-focused requirements that describe observable outcomes without leaking implementation details."
---

# BRIEF 原則（要求開発におけるガイド）

要求は微細な見た目の実装詳細を記述せず、ユーザーにとって意味のある振る舞いと状態だけを扱う。実装詳細や装飾の細部は設計書で調整し、要求書には必要最低限の観測可能な情報だけを残す。

- 観測可能な状態: 個体数、草量、環境（明るさ／気温）
- 観測可能な操作: 設定変更、個体追加、リセット
- 記載しない内容: px 単位の詳細レイアウト、色の逐一指定、コンポーネントの細粒度仕様、技術的な実装手順

この原則により、要求は「何が起こるか」と「何が変化したか」を中心に定義し、設計や実装の見た目に過剰に縛られない。
