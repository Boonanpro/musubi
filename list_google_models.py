import google.generativeai as genai
import os
import sys

# APIキーを環境変数から読み込み
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    # デバッグ用：環境変数を確認
    print(f"Debug: All env vars containing 'GOOGLE': {[k for k in os.environ.keys() if 'GOOGLE' in k]}")
    print("Error: GOOGLE_API_KEY environment variable is not set")
    sys.exit(1)

genai.configure(api_key=api_key)

print("【利用可能なモデル一覧】")
print("-" * 50)

models_found = []
for m in genai.list_models():
    # "generateContent"（チャットや文章生成）に対応しているモデルのみ表示
    if 'generateContent' in m.supported_generation_methods:
        model_name = m.name.replace('models/', '')
        models_found.append(model_name)
        print(f"ID: {model_name}")
        if hasattr(m, 'description') and m.description:
            print(f"説明: {m.description}")
        print("-" * 50)

print(f"\n合計 {len(models_found)} 個のモデルが見つかりました。")
print("\nモデルID一覧:")
for model_id in models_found:
    print(f"  - {model_id}")

