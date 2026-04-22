# 岭南康养·灵境向导 - 后端主程序
import sys
import io
# 修复Windows控制台编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
from pathlib import Path

app = Flask(__name__)
CORS(app)

# 加载环境变量
load_dotenv()

# 知识库路径
KNOWLEDGE_BASE_PATH = Path(__file__).parent / "knowledge_base"

# 系统提示词
SYSTEM_PROMPT = """你是「岭南康养·灵境向导」AI智能体，专为东莞理工学院师生打造，核心定位是岭南文化科普、健康知识答疑、岭南养生方案推荐。

你的回答必须严格遵循以下规则：
1. 所有内容必须紧扣「岭南文化+健康」主题，融合岭南非遗、粤剧、中医药、民俗、健康饮食、岭南建筑等元素
2. 回答要专业、科学，符合岭南地域特色，针对岭南气候（湿热）、饮食习惯给出适配建议
3. 语言风格亲切易懂，适合校园师生，避免过于晦涩的专业术语
4. 当用户提问超出岭南文化/健康主题时，礼貌引导用户回到主题
5. 所有健康建议仅为科普参考，不替代专业医疗诊断，必要时提醒用户咨询专业医师
6. 结构清晰，分点输出，重点内容加粗，提升可读性
7. 如果有相关的知识库内容，请结合知识库内容回答

请用中文回答，保持热情友好的语气！"""

# 加载知识库
def load_knowledge_base():
    knowledge = {}

    # 加载岭南非遗
    heritage_file = KNOWLEDGE_BASE_PATH / "lingnan_culture" / "intangible_heritage.md"
    if heritage_file.exists():
        knowledge['intangible_heritage'] = heritage_file.read_text(encoding='utf-8')

    # 加载建筑
    arch_file = KNOWLEDGE_BASE_PATH / "lingnan_culture" / "architecture.md"
    if arch_file.exists():
        knowledge['architecture'] = arch_file.read_text(encoding='utf-8')

    # 加载饮食文化
    food_file = KNOWLEDGE_BASE_PATH / "lingnan_culture" / "food_culture.md"
    if food_file.exists():
        knowledge['food_culture'] = food_file.read_text(encoding='utf-8')

    # 加载民俗
    folk_file = KNOWLEDGE_BASE_PATH / "lingnan_culture" / "folk_customs.md"
    if folk_file.exists():
        knowledge['folk_customs'] = folk_file.read_text(encoding='utf-8')

    # 加载四季养生
    seasonal_file = KNOWLEDGE_BASE_PATH / "health_knowledge" / "seasonal_health.md"
    if seasonal_file.exists():
        knowledge['seasonal_health'] = seasonal_file.read_text(encoding='utf-8')

    # 加载食疗药膳
    herbal_file = KNOWLEDGE_BASE_PATH / "health_knowledge" / "herbal_food.md"
    if herbal_file.exists():
        knowledge['herbal_food'] = herbal_file.read_text(encoding='utf-8')

    # 加载九种体质
    physique_file = KNOWLEDGE_BASE_PATH / "physique" / "nine_constitutions.md"
    if physique_file.exists():
        knowledge['nine_constitutions'] = physique_file.read_text(encoding='utf-8')

    # 加载东莞特色
    guanxiang_file = KNOWLEDGE_BASE_PATH / "dongguan_features" / "guanxiang.md"
    if guanxiang_file.exists():
        knowledge['guanxiang'] = guanxiang_file.read_text(encoding='utf-8')

    dragonboat_file = KNOWLEDGE_BASE_PATH / "dongguan_features" / "dragon_boat.md"
    if dragonboat_file.exists():
        knowledge['dragon_boat'] = dragonboat_file.read_text(encoding='utf-8')

    yueopera_file = KNOWLEDGE_BASE_PATH / "dongguan_features" / "yue_opera.md"
    if yueopera_file.exists():
        knowledge['yue_opera'] = yueopera_file.read_text(encoding='utf-8')

    return knowledge

# 简单的关键词检索
def retrieve_knowledge(query, knowledge):
    relevant_docs = []
    keywords = query.lower().split()

    for key, content in knowledge.items():
        for keyword in keywords:
            if keyword in content.lower() or keyword in key.lower():
                relevant_docs.append(f"【{key}】\n{content[:1000]}...")
                break

    return "\n\n".join(relevant_docs[:3]) if relevant_docs else ""

# 生成回复（使用模拟或真实API）
def generate_response(messages):
    # 检查是否有配置API
    api_key = os.getenv("DOUBAO_API_KEY")
    endpoint = os.getenv("DOUBAO_ENDPOINT", "https://ark.cn-beijing.volces.com/api/v3")
    model = os.getenv("DOUBAO_MODEL", "doubao-seed-2-0-pro-260215")

    if api_key:
        try:
            print(f"[调试] 使用端点: {endpoint}")
            print(f"[调试] 使用模型: {model}")

            from openai import OpenAI
            client = OpenAI(
                api_key=api_key,
                base_url=endpoint,
                timeout=30.0
            )

            # 构建完整的提示词
            system_prompt = next((m["content"] for m in messages if m["role"] == "system"), "")
            user_messages = [m for m in messages if m["role"] != "system"]

            # 使用最简单的格式：直接把最后一条用户消息用 content 字符串发送
            last_user_msg = user_messages[-1]["content"] if user_messages else "你好"

            # 如果有历史对话，拼接到提示词里
            full_prompt = system_prompt
            if len(user_messages) > 1:
                history_text = "\n\n之前的对话：\n"
                for msg in user_messages[:-1]:
                    history_text += f"{msg['role']}: {msg['content']}\n"
                full_prompt += history_text

            response = client.responses.create(
                model=model,
                input=[
                    {
                        "role": "user",
                        "content": last_user_msg
                    }
                ],
                max_output_tokens=2000,
                store=True
            )

            print(f"[调试] API调用成功!")
            print(f"[调试] 响应状态: {response.status}")

            # 从响应中提取文本 - 根据看到的结构
            result_text = ""
            try:
                if hasattr(response, 'output') and response.output:
                    for item in response.output:
                        if hasattr(item, 'summary') and item.summary:
                            for summary_item in item.summary:
                                if hasattr(summary_item, 'text'):
                                    result_text += summary_item.text
            except Exception as e:
                print(f"[调试] 解析响应失败: {e}")
                result_text = str(response)

            if not result_text:
                result_text = "抱歉，AI生成失败，请重试。"

            return result_text
        except Exception as e:
            import traceback
            print(f"[调试] API调用失败: {e}")
            print(f"[调试] 详细错误: {traceback.format_exc()}")
            print("[调试] 使用备用回复")
            return generate_fallback_response(messages[-1]['content'])
    else:
        print("[调试] 未配置API密钥，使用备用回复")
        return generate_fallback_response(messages[-1]['content'])

# 备用回复（无API时使用）
def generate_fallback_response(query):
    q = query.lower()

    responses = {
        '凉茶': RESPONSE_TEMPLATES['aboutLiangcha'],
        '祛湿': RESPONSE_TEMPLATES['aboutShire'],
        '湿气': RESPONSE_TEMPLATES['aboutShire'],
        '粤剧': RESPONSE_TEMPLATES['aboutYueju'],
        '春分': RESPONSE_TEMPLATES['aboutChunfen'],
        '节气': RESPONSE_TEMPLATES['aboutChunfen'],
        '东莞': RESPONSE_TEMPLATES['aboutDongguan'],
        '莞香': RESPONSE_TEMPLATES['aboutDongguan'],
        '龙舟': RESPONSE_TEMPLATES['aboutDongguan'],
        '你好': RESPONSE_TEMPLATES['greeting'],
        '您好': RESPONSE_TEMPLATES['greeting'],
        'hi': RESPONSE_TEMPLATES['greeting'],
        'hello': RESPONSE_TEMPLATES['greeting'],
    }

    for key, value in responses.items():
        if key in q:
            return value

    return RESPONSE_TEMPLATES['default']

RESPONSE_TEMPLATES = {
    'greeting': """你好！我是**岭南康养·灵境向导** 🌟

我是融合岭南文化（广府、潮汕、客家）与现代健康知识的AI智能体。我可以帮你：

- 🏛️ 了解岭南文化、非遗、民俗
- 💬 解答健康疑问，推荐养生方案
- 📅 查看24节气养生指南
- 🧘 进行体质测试，获取个性化建议

试试问我关于凉茶、粤剧、祛湿调理等问题吧！""",

    'default': f"""感谢您的提问！作为岭南康养·灵境向导，我会结合岭南文化特色和健康知识为您解答。

您可以试试以下话题：
- 岭南文化：凉茶、粤剧、醒狮、龙舟、莞香
- 健康养生：祛湿、清热、食疗药膳
- 节气养生：24节气养生要点
- 体质辨识：九种体质养生方案

（提示：配置火山引擎API后，我可以提供更智能的回答！）""",

    'aboutLiangcha': """## 🍵 岭南凉茶

**历史渊源**：凉茶起源于岭南，有数百年历史。岭南地处亚热带，气候炎热多雨，易生湿热，凉茶应运而生。

**健康智慧**：运用"清热、祛湿、解毒"的中医理念，采用金银花、菊花、夏枯草、蒲公英等药食同源的中草药。

**经典配方推荐**：

1. **五花茶**
   - 成分：金银花、菊花、槐花、木棉花、鸡蛋花
   - 功效：清热解毒、祛湿利水

2. **夏桑菊**
   - 成分：夏枯草、桑叶、菊花
   - 功效：清肝明目、疏风散热""",

    'aboutShire': """## 💧 岭南地区祛湿调理

岭南地区气候炎热多雨，湿气较重，容易出现身体困倦、舌苔厚腻等症状。

### 饮食调理
- **祛湿食材**：薏米、赤小豆、冬瓜、陈皮、茯苓、木棉花
- **推荐汤品**：陈皮薏米冬瓜汤、木棉花鲫鱼汤、赤小豆排骨汤

### 生活起居
- 避免久居潮湿环境
- 适当运动，通过出汗排出湿气
- 保持充足睡眠，避免熬夜""",

    'aboutYueju': """## 🎭 粤剧文化与健康养生

**粤剧**，被誉为"南国红豆"，是广东地区最具代表性的戏曲剧种。

### 历史与特色
- 起源于明代中叶，融合弋阳腔、昆腔等
- 特色：唱、做、念、打，运用广东方言演唱
- 经典剧目：《帝女花》、《紫钗记》

### 健康关联
1. **嗓音养护**：腹式呼吸，增强肺部功能
2. **身段锻炼**：塑造优美体态
3. **文化养生**：陶冶情操、舒缓压力""",

    'aboutChunfen': """## 🌸 春分节气岭南养生方案

春分是春季九十天的中分点，此时阴阳平衡，昼夜均等。

### 养生要点
- **饮食调养**：宜省酸增甘，多食用春季时令蔬菜
- **起居调养**：早睡早起，适当早起晨练
- **运动调养**：散步、慢跑、太极拳、八段锦
- **情志调养**：保持心情舒畅，戒怒戒躁""",

    'aboutDongguan': """## 🐲 东莞特色非遗文化

东莞作为岭南历史文化名城，拥有丰富的非物质文化遗产：

### 1. 莞香制作技艺 🌳
- **历史**：明代朝廷贡品，因产于东莞而得名
- **特色**：香气清新，安神定志
- **香市**：寮步香市是广东四大名市之一

### 2. 东莞龙舟 🚣
- **特色**：东莞"五月节"龙舟活动
- **文化**：起龙仪式、龙舟饭

### 3. 东莞粤剧 🎭
- 东莞是粤剧的重要发源地之一
- 民间粤剧社团活跃"""
}

# 全局知识库
knowledge_base = load_knowledge_base()

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('frontend', path)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    conversation_history = data.get('history', [])

    # 检索相关知识
    context = retrieve_knowledge(user_message, knowledge_base)

    # 构建消息
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    if context:
        messages[0]["content"] += f"\n\n以下是相关知识库内容供参考：\n{context}"

    # 添加历史对话
    for msg in conversation_history:
        messages.append(msg)

    messages.append({"role": "user", "content": user_message})

    # 生成回复
    assistant_message = generate_response(messages)

    return jsonify({
        'success': True,
        'message': assistant_message
    })

@app.route('/api/health', methods=['GET'])
def health():
    api_key = os.getenv("DOUBAO_API_KEY")
    return jsonify({
        'status': 'ok',
        'api_configured': bool(api_key),
        'knowledge_loaded': len(knowledge_base)
    })

if __name__ == '__main__':
    print("🏮 岭南康养·灵境向导启动中...")
    print(f"📚 已加载 {len(knowledge_base)} 个知识库文档")
    print(f"🔑 API配置: {'已配置' if os.getenv('DOUBAO_API_KEY') else '未配置(使用备用回复)'}")
    print("🌐 访问: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
