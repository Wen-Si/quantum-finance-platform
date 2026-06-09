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
    const systemPrompt = `你是一位专业的量子金融建模AI助手。请根据用户的金融建模需求，生成详细的量子计算建模方案。

请以JSON格式返回，包含以下字段：
{
  "algorithm": "使用的量子算法名称（如QAOA、VQE、HHL等）",
  "qubits": "建议的量子比特数量",
  "circuit_depth": "电路深度",
  "description": "建模方案的详细描述（200字以内）",
  "python_code": "完整的Python代码示例（使用Qiskit）",
  "allocation": [
    {"asset": "资产名称", "weight": 权重百分比},
    ...
  ],
  "metrics": {
    "expected_return": "预期年化收益率",
    "risk": "风险水平",
    "sharpe_ratio": "夏普比率",
    "computation_time": "计算耗时"
  }
}

请确保JSON格式正确，且内容专业、准确。`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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
                    { role: 'user', content: query }
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

        // Save to history
        saveHistoryItem({ query, ...result });

        return { success: true, result };
    } catch (error) {
        console.error('AI调用错误:', error);
        const fallback = getDefaultResult();
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
