// Pure Frontend Configuration - No backend required
// All data stored in localStorage

// Auth token storage
function getToken() {
    return localStorage.getItem('quantum_finance_token');
}

function setToken(token) {
    localStorage.setItem('quantum_finance_token', token);
}

function removeToken() {
    localStorage.removeItem('quantum_finance_token');
}

function isLoggedIn() {
    return !!getToken();
}

// User storage in localStorage
function getUsers() {
    const users = localStorage.getItem('quantum_finance_users');
    return users ? JSON.parse(users) : {};
}

function saveUsers(users) {
    localStorage.setItem('quantum_finance_users', JSON.stringify(users));
}

function getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    const users = getUsers();
    return users[token] || null;
}

// History storage in localStorage
function getHistory() {
    const user = getCurrentUser();
    if (!user) return [];
    const historyKey = `quantum_finance_history_${user.username}`;
    const history = localStorage.getItem(historyKey);
    return history ? JSON.parse(history) : [];
}

function saveHistoryItem(item) {
    const user = getCurrentUser();
    if (!user) return;
    const historyKey = `quantum_finance_history_${user.username}`;
    const history = getHistory();
    history.unshift({
        id: Date.now(),
        query: item.query,
        algorithm: item.algorithm || 'QAOA',
        qubits: item.qubits || '24',
        circuit_depth: item.circuit_depth || '12',
        description: item.description || '',
        python_code: item.python_code || '',
        allocation: item.allocation || [],
        metrics: item.metrics || {},
        created_at: new Date().toISOString()
    });
    // Keep only last 50 items
    if (history.length > 50) history.pop();
    localStorage.setItem(historyKey, JSON.stringify(history));
}

// Auth API - Local implementation
async function register(username, password) {
    const users = getUsers();
    if (users[username]) {
        throw new Error('用户名已存在');
    }
    if (username.length < 3 || password.length < 6) {
        throw new Error('用户名至少3位，密码至少6位');
    }
    
    // Simple hash (not secure, but sufficient for demo)
    const token = btoa(username + ':' + Date.now());
    users[username] = {
        username,
        password, // In production, never store plain text passwords
        token,
        created_at: new Date().toISOString()
    };
    saveUsers(users);
    setToken(token);
    return { token, username, message: '注册成功' };
}

async function login(username, password) {
    const users = getUsers();
    const user = users[username];
    if (!user) {
        throw new Error('用户名或密码错误');
    }
    if (user.password !== password) {
        throw new Error('用户名或密码错误');
    }
    setToken(user.token);
    return { token: user.token, username, message: '登录成功' };
}

async function getMe() {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('未登录');
    }
    return { userId: user.token, username: user.username };
}

// Modeling API - Direct Zhipu AI call
const ZHIPU_API_KEY = '325d6fa364954d2e871c30ba95b553bd.KBdQdqgJgELJBhnv';
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

async function createModeling(query) {
    // Step 1: Fetch real fund data from MCP
    let mcpData = null;
    let dataContext = '';
    
    try {
        if (window.MCPClient) {
            const mcpResult = await window.MCPClient.buildAIPromptWithRealData(query);
            mcpData = mcpResult.mcpData;
            dataContext = mcpResult.dataContext;
            dataSource = mcpResult.dataSource;
        }
    } catch (mcpError) {
        console.warn('MCP数据获取失败，使用纯AI生成:', mcpError);
    }

    const systemPrompt = `你是一位专业的量子金融建模AI助手。请仔细分析用户的金融建模需求，生成完全针对性的量子计算建模方案。

## 重要规则
1. 你必须根据用户的具体问题类型（投资组合优化、风险分析、期权定价、欺诈检测等）选择最合适的量子算法
2. 所有字段必须针对用户输入的问题定制，禁止返回通用模板内容
3. 资产配置必须反映用户提到的具体资产或行业
4. Python代码必须完整可运行，且直接解决用户的问题
5. 如果有提供真实基金数据，必须在分析中引用这些数据，生成基于真实数据的建模方案

## 输出JSON格式
{
  "problem_type": "识别的问题类型（投资组合优化/风险分析/期权定价/欺诈检测/其他）",
  "algorithm": "根据问题类型选择的最佳量子算法（QAOA/VQE/HHL/QSVM/量子蒙特卡洛等）",
  "qubits": "建议的量子比特数量（数字）",
  "circuit_depth": "电路深度（数字）",
  "description": "针对用户问题的详细建模方案描述（150字以内，必须提及用户的具体问题）",
  "python_code": "完整的、可运行的Python代码（使用Qiskit），代码必须直接解决用户描述的问题，包含完整的导入、数据定义、模型构建和结果输出",
  "circuit_svg": "完整的SVG代码字符串，用于在网页中渲染量子电路图。SVG必须包含：量子比特线、Hadamard门、CNOT门、旋转门(RZ/RY/RX)、测量门。SVG viewBox设为'0 0 800 200'，宽度800，高度200。根据qubits数量动态调整量子比特线数量，根据algorithm类型选择合适的门序列。",
  "convergence_data": [
    {"iteration": 0, "energy": -2.5},
    {"iteration": 1, "energy": -2.3},
    ...
  ],
  "allocation": [
    {"asset": "具体资产名称", "weight": 权重百分比},
    ...
  ],
  "metrics": {
    "expected_return": "预期年化收益率",
    "risk": "风险水平",
    "sharpe_ratio": "夏普比率",
    "computation_time": "计算耗时"
  }
}

## 问题类型与算法匹配
- 投资组合优化 → QAOA
- 风险分析/风险管理 → VQE 或量子蒙特卡洛
- 期权定价 → 量子蒙特卡洛或HHL
- 欺诈检测 → QSVM（量子支持向量机）
- 利率预测 → 量子神经网络

## 量子电路SVG生成规则
- SVG viewBox="0 0 800 200"
- 量子比特线水平排列，标签在左侧
- Hadamard门用H标记的方框
- CNOT门用圆点+竖线表示
- 旋转门用RZ/RY/RX标记的方框
- 测量门用M标记的方框
- 不同算法使用不同颜色主题
- 电路结构必须反映实际算法的门序列

## 收敛曲线数据
- 提供50个迭代点的收敛数据
- 能量值应呈现明显的收敛趋势
- 初始值较高，逐渐降低并趋于稳定
- 根据算法类型调整收敛速度和波动幅度
- QAOA: 快速收敛，波动较小
- VQE: 中等收敛速度，有一定波动
- HHL: 线性收敛
- QSVM: 阶梯式收敛

请确保JSON格式正确，所有内容针对用户的具体问题定制。`;

    // Build user message with MCP data if available
    let userMessage = query;
    if (dataContext) {
        userMessage = query + '\n\n' + dataContext + '\n\n请基于以上真实数据，生成针对性的量子金融建模方案。';
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(ZHIPU_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ZHIPU_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 4096
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiContent = data.choices[0].message.content;

        // Parse AI response
        let result;
        try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                result = parseAIResponse(aiContent);
            }
        } catch (e) {
            console.warn('AI响应解析失败，使用默认方案:', e);
            result = getDefaultResult();
        }

        // Merge MCP data into result for frontend display
        if (mcpData) {
            const hasData = (mcpData.funds && mcpData.funds.length > 0) || mcpData.dailyBars || mcpData.indexData;
            if (hasData) {
                result.mcpData = mcpData;
                result.dataSource = dataSource;
            }
        }

        // Save to history
        saveHistoryItem({ query, ...result });

        return { success: true, result };
    } catch (error) {
        console.error('AI调用错误:', error);
        const fallback = getDefaultResult();
        if (mcpData) fallback.mcpData = mcpData;
        saveHistoryItem({ query, ...fallback });
        return { success: true, result: fallback, fallback: true };
    }
}

function parseAIResponse(content) {
    return {
        algorithm: content.match(/算法[：:]\s*(.+)/)?.[1] || 'QAOA',
        qubits: content.match(/量子比特[：:]\s*(\d+)/)?.[1] || '24',
        circuit_depth: content.match(/电路深度[：:]\s*(\d+)/)?.[1] || '12',
        description: content.substring(0, 200),
        python_code: content.match(/```python\n([\s\S]*?)```/)?.[1] || getDefaultPythonCode(),
        allocation: [
            { asset: 'AAPL', weight: 25 },
            { asset: 'MSFT', weight: 20 },
            { asset: 'GOOGL', weight: 18 },
            { asset: 'AMZN', weight: 15 },
            { asset: 'TSLA', weight: 12 },
            { asset: '其他', weight: 10 }
        ],
        metrics: {
            expected_return: '18.5%',
            risk: '12.3%',
            sharpe_ratio: '1.42',
            computation_time: '2.3s'
        }
    };
}

function getDefaultResult() {
    return {
        algorithm: 'QAOA',
        qubits: '24',
        circuit_depth: '12',
        description: '使用量子近似优化算法(QAOA)求解投资组合优化问题。将马科维茨均值-方差模型转化为QUBO形式，通过量子变分电路寻找最优资产配置。',
        python_code: getDefaultPythonCode(),
        allocation: [
            { asset: 'AAPL', weight: 25 },
            { asset: 'MSFT', weight: 20 },
            { asset: 'GOOGL', weight: 18 },
            { asset: 'AMZN', weight: 15 },
            { asset: 'TSLA', weight: 12 },
            { asset: '其他', weight: 10 }
        ],
        metrics: {
            expected_return: '18.5%',
            risk: '12.3%',
            sharpe_ratio: '1.42',
            computation_time: '2.3s'
        }
    };
}

function getDefaultPythonCode() {
    return `from qiskit import QuantumCircuit
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer

# 定义投资组合优化问题
qp = QuadraticProgram()
assets = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
for asset in assets:
    qp.binary_var(name=asset)

# 目标函数: 最大化夏普比率
qp.maximize(linear=expected_returns, quadratic=covariance_matrix)

# 约束条件
qp.linear_constraint(
    linear={asset: 1 for asset in assets},
    sense='==',
    rhs=1,
    name='budget_constraint'
)

# 使用QAOA求解
qaoa = QAOA(optimizer=COBYLA(maxiter=100), reps=3)
optimizer = MinimumEigenOptimizer(qaoa)
result = optimizer.solve(qp)

print(f"最优投资组合: {result.x}")
print(f"预期收益: {result.fval:.4f}")`;
}
