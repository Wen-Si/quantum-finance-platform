// 盈米 MCP Client - 金融数据底层配置
// 文档: https://cloud.tencent.com/developer/mcp/server/11801

const YINGMI_MCP_CONFIG = {
    url: 'https://stargate.yingmi.com/mcp/v2',
    headers: {
        'x-api-key': 'nx9zj5PlwItm5I81oV_aVQ',
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
    }
};

// Tushare MCP 配置 - A股市场行情数据
const TUSHARE_MCP_CONFIG = {
    url: 'https://api.tushare.pro/mcp/?token=cd854e5eec6ac50c8ead11982f5333bf61345a847399d62c63c42776',
    headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
    }
};

// 带超时的fetch封装
async function fetchWithTimeout(url, options, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('请求超时');
        }
        throw error;
    }
}

// 盈米 MCP JSON-RPC 调用封装
async function yingmiMcpCall(method, params = {}) {
    const requestBody = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
    };

    try {
        const response = await fetchWithTimeout(YINGMI_MCP_CONFIG.url, {
            method: 'POST',
            headers: YINGMI_MCP_CONFIG.headers,
            body: JSON.stringify(requestBody)
        }, 5000);

        if (!response.ok) {
            throw new Error(`盈米MCP请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`盈米MCP错误: ${data.error.message}`);
        }

        return data.result;
    } catch (error) {
        console.warn('盈米MCP调用错误:', error.message);
        throw error;
    }
}

// Tushare MCP JSON-RPC 调用封装
async function tushareMcpCall(method, params = {}) {
    const requestBody = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
    };

    try {
        const response = await fetchWithTimeout(TUSHARE_MCP_CONFIG.url, {
            method: 'POST',
            headers: TUSHARE_MCP_CONFIG.headers,
            body: JSON.stringify(requestBody)
        }, 5000);

        if (!response.ok) {
            throw new Error(`Tushare MCP请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Tushare MCP错误: ${data.error.message}`);
        }

        return data.result;
    } catch (error) {
        console.warn('Tushare MCP调用错误:', error.message);
        throw error;
    }
}

// ========== 盈米：基金信息查询 ==========

// 搜索基金
async function searchFunds(keyword, pageSize = 10) {
    return await yingmiMcpCall('SearchFunds', {
        keyword: keyword,
        pageSize: pageSize
    });
}

// 批量获取基金详情
async function getFundsDetail(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await yingmiMcpCall('BatchGetFundsDetail', {
        fundCodes: codes
    });
}

// 批量获取基金历史净值
async function getFundNavHistory(fundCodes, startDate, endDate) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await yingmiMcpCall('BatchGetFundNavHistory', {
        fundCodes: codes,
        startDate: startDate,
        endDate: endDate
    });
}

// 批量获取基金业绩表现
async function getFundPerformance(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await yingmiMcpCall('GetBatchFundPerformance', {
        fundCodes: codes
    });
}

// 获取热门基金
async function getPopularFunds(pageSize = 10) {
    return await yingmiMcpCall('GetPopularFund', {
        pageSize: pageSize
    });
}

// 基金代码模糊匹配
async function guessFundCode(fundName) {
    return await yingmiMcpCall('GuessFundCode', {
        fundName: fundName
    });
}

// ========== 基金分析 ==========

// 基金诊断
async function diagnoseFund(fundCode) {
    return await yingmiMcpCall('GetFundDiagnosis', {
        fundCode: fundCode
    });
}

// 基金风险分析
async function analyzeFundRisk(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await yingmiMcpCall('AnalyzeFundRisk', {
        fundCodes: codes
    });
}

// 资产配置分析
async function getAssetAllocation(fundCodes, weights) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    const w = weights || codes.map(() => 1 / codes.length);
    return await yingmiMcpCall('GetAssetAllocation', {
        fundCodes: codes,
        weights: w
    });
}

// 组合回测
async function backtestPortfolio(fundCodes, weights, startDate, endDate) {
    return await yingmiMcpCall('GetFundsBackTest', {
        fundCodes: fundCodes,
        weights: weights,
        startDate: startDate,
        endDate: endDate
    });
}

// 基金相关性分析
async function getFundsCorrelation(fundCodes) {
    return await yingmiMcpCall('GetFundsCorrelation', {
        fundCodes: fundCodes
    });
}

// 蒙特卡洛模拟
async function monteCarloSimulate(weights, expectedReturns, volatilities, correlations, simulations = 10000) {
    return await yingmiMcpCall('MonteCarloSimulate', {
        weights: weights,
        expectedReturns: expectedReturns,
        volatilities: volatilities,
        correlations: correlations,
        simulations: simulations
    });
}

// ========== 组合风险分析 ==========

// 组合风险评估
async function analyzePortfolioRisk(fundCodes, weights) {
    return await yingmiMcpCall('AnalyzePortfolioRisk', {
        fundCodes: fundCodes,
        weights: weights
    });
}

// 持仓诊断
async function diagnosePortfolio(fundCodes, weights) {
    return await yingmiMcpCall('DiagnoseFundPortfolio', {
        fundCodes: fundCodes,
        weights: weights
    });
}

// ========== 财经资讯 ==========

// 搜索财经新闻
async function searchFinancialNews(keyword, startDate, endDate, pageSize = 10) {
    return await yingmiMcpCall('SearchFinancialNews', {
        keyword: keyword,
        startDate: startDate,
        endDate: endDate,
        pageSize: pageSize
    });
}

// 获取基金经理观点
async function getManagerViewpoints(keyword, pageSize = 10) {
    return await yingmiMcpCall('SearchManagerViewpoint', {
        keyword: keyword,
        pageSize: pageSize
    });
}

// ========== Tushare：A股市场行情数据 ==========

// A股关键词检测
const A_STOCK_KEYWORDS = [
    'A股', 'a股', '上证', '深证', '创业板', '科创板', '北交所',
    '沪深', '沪深300', '中证500', '上证50', '中小板',
    '股票行情', '股价', '涨停', '跌停', '牛市', '熊市',
    '市盈率', '市净率', '换手率', '成交量', '成交额',
    'K线', '日K', '周K', '月K', '均线', 'MACD', 'RSI',
    '贵州茅台', '中国平安', '招商银行', '宁德时代', '比亚迪',
    '腾讯', '阿里巴巴', '工商银行', '中国移动', '中石油',
    '大盘', '指数', '沪指', '深成指', '创指',
    '龙虎榜', '融资融券', '沪港通', '深港通', '北向资金',
    '财务报表', '利润表', '资产负债表', '现金流量表', 'ROE',
    '宏观经济', 'GDP', 'CPI', 'PPI', 'PMI', '社融',
    '行业板块', '概念板块', '热点板块', '资金流向',
    '期权', '期货', '债券', '可转债', 'ETF'
];

// 判断用户输入是否涉及A股市场
function isAStockQuery(query) {
    return A_STOCK_KEYWORDS.some(kw => query.includes(kw));
}

// 从用户输入中提取股票代码
function extractStockCodes(query) {
    const codes = [];
    // 匹配6位数字股票代码
    const codeMatches = query.match(/\b(\d{6})\b/g);
    if (codeMatches) {
        codeMatches.forEach(code => {
            if (code.startsWith('6') || code.startsWith('0') || code.startsWith('3') || code.startsWith('8') || code.startsWith('4')) {
                codes.push(code);
            }
        });
    }
    return codes;
}

// 获取A股股票列表
async function getStockList() {
    return await tushareMcpCall('get_stock_list', {});
}

// 获取日K线数据
async function getDailyBars(tsCode, startDate, endDate) {
    return await tushareMcpCall('get_daily_bars', {
        ts_code: tsCode,
        start_date: startDate,
        end_date: endDate
    });
}

// 获取每日基本面指标（PE/PB/市值等）
async function getDailyBasic(tsCode, startDate, endDate) {
    return await tushareMcpCall('get_daily_basic', {
        ts_code: tsCode,
        start_date: startDate,
        end_date: endDate
    });
}

// 获取指数日线数据
async function getIndexDaily(tsCode, startDate, endDate) {
    return await tushareMcpCall('get_index_daily', {
        ts_code: tsCode,
        start_date: startDate,
        end_date: endDate
    });
}

// 获取资金流向数据
async function getMoneyFlow(tsCode, startDate, endDate) {
    return await tushareMcpCall('get_moneyflow', {
        ts_code: tsCode,
        start_date: startDate,
        end_date: endDate
    });
}

// 获取概念板块列表
async function getConceptList() {
    return await tushareMcpCall('get_concept', {});
}

// 获取概念板块成分股
async function getConceptDetail(tsCode) {
    return await tushareMcpCall('get_concept_detail', {
        ts_code: tsCode
    });
}

// 获取财务指标
async function getFinaIndicator(tsCode) {
    return await tushareMcpCall('get_fina_indicator', {
        ts_code: tsCode
    });
}

// 获取利润表
async function getIncome(tsCode) {
    return await tushareMcpCall('get_income', {
        ts_code: tsCode
    });
}

// 通用Tushare查询（可调用173个API中的任意一个）
async function tushareQuery(apiName, params = {}) {
    return await tushareMcpCall('tushare_query', {
        api_name: apiName,
        params: params
    });
}

// 搜索Tushare API文档
async function searchTushareApiDocs(keyword) {
    return await tushareMcpCall('search_api_docs', {
        keyword: keyword
    });
}

// 从用户输入获取A股数据
async function getAStockDataFromQuery(query) {
    const results = {
        stocks: [],
        dailyBars: [],
        dailyBasic: [],
        indexData: null,
        moneyFlow: null,
        finaIndicator: null
    };

    try {
        const stockCodes = extractStockCodes(query);
        
        // 如果有明确的股票代码
        if (stockCodes.length > 0) {
            for (const code of stockCodes.slice(0, 3)) {
                const tsCode = code.startsWith('6') ? code + '.SH' : code + '.SZ';
                
                // 获取日K线
                try {
                    const bars = await getDailyBars(tsCode, '20260101', '20260610');
                    if (bars) results.dailyBars.push({ code: tsCode, data: bars });
                } catch(e) { console.warn('获取日K线失败:', e); }
                
                // 获取基本面指标
                try {
                    const basic = await getDailyBasic(tsCode, '20260601', '20260610');
                    if (basic) results.dailyBasic.push({ code: tsCode, data: basic });
                } catch(e) { console.warn('获取基本面失败:', e); }
                
                // 获取财务指标
                try {
                    const fina = await getFinaIndicator(tsCode);
                    if (fina) results.finaIndicator = fina;
                } catch(e) { console.warn('获取财务指标失败:', e); }
            }
        } else {
            // 没有明确代码，获取大盘指数数据
            try {
                const indexData = await getIndexDaily('000001.SH', '20260501', '20260610');
                if (indexData) results.indexData = indexData;
            } catch(e) { console.warn('获取指数数据失败:', e); }
            
            // 获取概念板块
            try {
                const concepts = await getConceptList();
                if (concepts) results.concepts = concepts;
            } catch(e) { console.warn('获取概念板块失败:', e); }
        }
    } catch (error) {
        console.error('获取A股数据失败:', error);
    }

    return results;
}

// ========== 智能数据获取（根据用户输入自动匹配） ==========

// 从用户输入中提取基金名称并获取数据
async function getFundsDataFromQuery(query) {
    const results = {
        funds: [],
        fundDetails: [],
        fundPerformance: [],
        assetAllocation: null,
        riskAnalysis: null,
        backtest: null
    };

    try {
        // 1. 尝试搜索基金
        const searchResult = await searchFunds(query, 5);
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
            results.funds = searchResult.data;
            const fundCodes = searchResult.data.map(f => f.fundCode);

            // 2. 获取基金详情
            const details = await getFundsDetail(fundCodes);
            if (details) results.fundDetails = details;

            // 3. 获取业绩表现
            const performance = await getFundPerformance(fundCodes);
            if (performance) results.fundPerformance = performance;

            // 4. 如果提到多个基金，获取资产配置
            if (fundCodes.length >= 2) {
                const weights = fundCodes.map(() => 1 / fundCodes.length);
                const allocation = await getAssetAllocation(fundCodes, weights);
                if (allocation) results.assetAllocation = allocation;

                // 5. 组合风险分析
                const risk = await analyzePortfolioRisk(fundCodes, weights);
                if (risk) results.riskAnalysis = risk;
            }

            // 6. 单基金诊断
            if (fundCodes.length === 1) {
                const diagnosis = await diagnoseFund(fundCodes[0]);
                if (diagnosis) results.fundDiagnosis = diagnosis;
            }
        }
    } catch (error) {
        console.error('获取基金数据失败:', error);
    }

    return results;
}

// 构建带有真实数据的AI提示词（智能路由：A股→Tushare，基金→盈米）
async function buildAIPromptWithRealData(userQuery) {
    let mcpData = null;
    let dataContext = '';
    let dataSource = '';

    if (isAStockQuery(userQuery)) {
        // A股相关 → 走Tushare MCP
        dataSource = 'tushare';
        try {
            mcpData = await Promise.race([
                getAStockDataFromQuery(userQuery),
                new Promise((_, reject) => setTimeout(() => reject(new Error('MCP超时')), 8000))
            ]);
        } catch (e) {
            console.warn('Tushare MCP获取超时或失败:', e.message);
            mcpData = { stocks: [], dailyBars: [], dailyBasic: [], indexData: null };
        }
        
        if (mcpData.dailyBars && mcpData.dailyBars.length > 0) {
            dataContext += '\n## 真实A股行情数据（来自Tushare MCP）\n';
            mcpData.dailyBars.forEach(bar => {
                dataContext += `\n股票 ${bar.code} 近期K线数据:\n`;
                if (bar.data && bar.data.items) {
                    const items = bar.data.items.slice(-5);
                    items.forEach(item => {
                        dataContext += `  日期:${item.trade_date} 开盘:${item.open} 收盘:${item.close} 最高:${item.high} 最低:${item.low} 成交量:${item.vol}\n`;
                    });
                }
            });
        }
        
        if (mcpData.dailyBasic && mcpData.dailyBasic.length > 0) {
            mcpData.dailyBasic.forEach(basic => {
                dataContext += `\n股票 ${basic.code} 基本面指标:\n`;
                if (basic.data && basic.data.items) {
                    const items = basic.data.items.slice(-3);
                    items.forEach(item => {
                        dataContext += `  PE:${item.pe} PB:${item.pb} 总市值:${item.total_mv} 换手率:${item.turnover_rate}\n`;
                    });
                }
            });
        }
        
        if (mcpData.indexData) {
            dataContext += '\n上证指数近期走势:\n';
            if (mcpData.indexData.items) {
                mcpData.indexData.items.slice(-5).forEach(item => {
                    dataContext += `  日期:${item.trade_date} 收盘:${item.close} 涨跌幅:${item.pct_chg}%\n`;
                });
            }
        }
        
        if (mcpData.finaIndicator) {
            dataContext += '\n财务指标:\n';
            dataContext += JSON.stringify(mcpData.finaIndicator, null, 2);
        }
    } else {
        // 基金相关 → 走盈米 MCP
        dataSource = 'yingmi';
        try {
            mcpData = await Promise.race([
                getFundsDataFromQuery(userQuery),
                new Promise((_, reject) => setTimeout(() => reject(new Error('MCP超时')), 8000))
            ]);
        } catch (e) {
            console.warn('盈米 MCP获取超时或失败:', e.message);
            mcpData = { funds: [], fundDetails: [], fundPerformance: [] };
        }
        
        if (mcpData.funds && mcpData.funds.length > 0) {
            dataContext += '\n## 真实基金数据（来自盈米MCP）\n';
            
            mcpData.funds.forEach((fund, idx) => {
                dataContext += `\n基金${idx + 1}: ${fund.fundName} (${fund.fundCode})\n`;
                
                if (mcpData.fundDetails && mcpData.fundDetails[idx]) {
                    const detail = mcpData.fundDetails[idx];
                    dataContext += `- 类型: ${detail.fundType || '未知'}\n`;
                    dataContext += `- 风险等级: ${detail.riskLevel || '未知'}\n`;
                    dataContext += `- 管理公司: ${detail.managementCompany || '未知'}\n`;
                    dataContext += `- 成立日期: ${detail.establishmentDate || '未知'}\n`;
                }
                
                if (mcpData.fundPerformance && mcpData.fundPerformance[idx]) {
                    const perf = mcpData.fundPerformance[idx];
                    dataContext += `- 近1年收益: ${perf.return1Year || 'N/A'}\n`;
                    dataContext += `- 近3年收益: ${perf.return3Year || 'N/A'}\n`;
                    dataContext += `- 夏普比率: ${perf.sharpeRatio || 'N/A'}\n`;
                    dataContext += `- 最大回撤: ${perf.maxDrawdown || 'N/A'}\n`;
                }
            });
            
            if (mcpData.assetAllocation) {
                dataContext += '\n资产配置分析:\n';
                dataContext += JSON.stringify(mcpData.assetAllocation, null, 2);
            }
            
            if (mcpData.riskAnalysis) {
                dataContext += '\n组合风险分析:\n';
                dataContext += JSON.stringify(mcpData.riskAnalysis, null, 2);
            }
            
            if (mcpData.fundDiagnosis) {
                dataContext += '\n基金诊断:\n';
                dataContext += JSON.stringify(mcpData.fundDiagnosis, null, 2);
            }
        }
    }
    
    return {
        mcpData: mcpData,
        dataContext: dataContext,
        dataSource: dataSource
    };
}

// 导出所有函数
window.MCPClient = {
    // 盈米 MCP
    searchFunds,
    getFundsDetail,
    getFundNavHistory,
    getFundPerformance,
    getPopularFunds,
    guessFundCode,
    diagnoseFund,
    analyzeFundRisk,
    getAssetAllocation,
    backtestPortfolio,
    getFundsCorrelation,
    monteCarloSimulate,
    analyzePortfolioRisk,
    diagnosePortfolio,
    searchFinancialNews,
    getManagerViewpoints,
    // Tushare MCP
    isAStockQuery,
    extractStockCodes,
    getStockList,
    getDailyBars,
    getDailyBasic,
    getIndexDaily,
    getMoneyFlow,
    getConceptList,
    getConceptDetail,
    getFinaIndicator,
    getIncome,
    tushareQuery,
    searchTushareApiDocs,
    getAStockDataFromQuery,
    // 智能路由
    getFundsDataFromQuery,
    buildAIPromptWithRealData
};
