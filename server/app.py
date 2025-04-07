from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
import json

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = "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"
MODEL = "meta-llama/llama-4-maverick:free" 

def extract_json_array(text):
    """
    尝试从字符串中提取 JSON 数组部分（支持中间有解释或markdown格式）
    """
    matches = re.findall(r"\[\s*\".*?\"\s*(?:,\s*\".*?\")*\s*\]", text, re.DOTALL)
    return matches[0] if matches else "[]"

@app.route('/highlight', methods=['POST'])
def highlight():
    data = request.json
    text = data['text'][:]

    prompt = f"""This is the site content: {text}"""

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "Highlight Plugin"
        },
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": f"You are a professional text read assistant. Your goal is to help reader better read the website/article step by step. Your task is to extract the useful knowledge information(sentence/keywords) directly from the original given content. \
Please return a JSON array like [\"sentence/keywords 1\", ..., \"sentence/keywords n\"]. Do not include any explanation or formatting. Just the array."},
                {"role": "user", "content": prompt}
            ]
        }
    )

    try:
        raw_text = response.json()["choices"][0]["message"]["content"]
        print("LLM返回原始内容:", raw_text)

        json_str = extract_json_array(raw_text)
        highlights = json.loads(json_str)

    except Exception as e:
        print("解析失败:", e)
        highlights = []

    return jsonify({"highlights": highlights})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)
