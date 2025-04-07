from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
import json
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

MODEL = "meta-llama/llama-4-maverick:free" 
load_dotenv()  # Load environment variables from .env file
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY environment variable not set.")

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
            "Authorization": f"Bearer { OPENROUTER_API_KEY }",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "Highlight Plugin"
        },
        json={
            "model": MODEL,
            "messages": [
                # {"role": "system", "content": f"You are an advanced reading comprehension assistant designed to help users quickly grasp website content. Analyze the given text and extract the most valuable information in these forms: 1) Key thesis statements that define the article's main arguments, 2) Essential facts and data points, 3) Critical topic sentences that structure main ideas, 4) Pivotal conclusions or implications. Direct quote from the original without any modification. Ensure each extract provides clear, standalone value. For technical or scientific content, prioritize methodology and findings. For narrative content, capture transformative moments and core insights. Return ONLY a clean JSON array of strings with these highlights originally from the given content, without explanations, numbering, or formatting: [\"highlight/keyword 1\", \"highlight/keyword 2\",...]."},
                {"role": "system", "content": f"You are a professional text read assistant. Your goal is to help reader better understand the website/article. Your task is to quote the useful knowledge(keywords/phrases/sentences) directly from the original given content.\
Please return a JSON array like [\"keywords 1\", ..., \"phrases/keywords n\"]. Do not include any explanation or formatting. Just the array."},
                {"role": "user", "content": prompt}
            ]
        }
    )

    try:
        print("LLM响应状态码:", response.status_code)
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
