// 盈米 MCP Client - 金融数据底层配置
// 文档: https://cloud.tencent.com/developer/mcp/server/11801

const MCP_CONFIG = {
    url: 'https://stargate.yingmi.com/mcp/v2',
    headers: {
        'x-api-key': 'nx9zj5PlwItm5I81oV_aVQ',
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
    }
};

// MCP JSON-RPC 调用封装
async function mcpCall(method, params = {}) {
    const requestBody = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
    };

    try {
        const response = await fetch(MCP_CONFIG.url, {
            method: 'POST',
            headers: MCP_CONFIG.headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`MCP请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`MCP错误: ${data.error.message}`);
        }

        return data.result;
    } catch (error) {
        console.error('MCP调用错误:', error);
        throw error;
    }
}

// ========== 基金信息查询 ==========

// 搜索基金
async function searchFunds(keyword, pageSize = 10) {
    return await mcpCall('SearchFunds', {
        keyword: keyword,
        pageSize: pageSize
    });
}

// 批量获取基金详情
async function getFundsDetail(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await mcpCall('BatchGetFundsDetail', {
        fundCodes: codes
    });
}

// 批量获取基金历史净值
async function getFundNavHistory(fundCodes, startDate, endDate) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await mcpCall('BatchGetFundNavHistory', {
        fundCodes: codes,
        startDate: startDate,
        endDate: endDate
    });
}

// 批量获取基金业绩表现
async function getFundPerformance(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await mcpCall('GetBatchFundPerformance', {
        fundCodes: codes
    });
}

// 获取热门基金
async function getPopularFunds(pageSize = 10) {
    return await mcpCall('GetPopularFund', {
        pageSize: pageSize
    });
}

// 基金代码模糊匹配
async function guessFundCode(fundName) {
    return await mcpCall('GuessFundCode', {
        fundName: fundName
    });
}

// ========== 基金分析 ==========

// 基金诊断
async function diagnoseFund(fundCode) {
    return await mcpCall('GetFundDiagnosis', {
        fundCode: fundCode
    });
}

// 基金风险分析
async function analyzeFundRisk(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    return await mcpCall('AnalyzeFundRisk', {
        fundCodes: codes
    });
}

// 资产配置分析
async function getAssetAllocation(fundCodes, weights) {
    const codes = Array.isArray(fundCodes) ? fundCodes : [fundCodes];
    const w = weights || codes.map(() => 1 / codes.length);
    return await mcpCall('GetAssetAllocation', {
        fundCodes: codes,
        weights: w
    });
}

// 组合回测
async function backtestPortfolio(fundCodes, weights, startDate, endDate) {
    return await mcpCall('GetFundsBackTest', {
        fundCodes: fundCodes,
        weights: weights,
        startDate: startDate,
        endDate: endDate
    });
}

// 基金相关性分析
async function getFundsCorrelation(fundCodes) {
    return await mcpCall('GetFundsCorrelation', {
        fundCodes: fundCodes
    });
}

// 蒙特卡洛模拟
async function monteCarloSimulate(weights, expectedReturns, volatilities, correlations, simulations = 10000) {
    return await mcpCall('MonteCarloSimulate', {
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
    return await mcpCall('AnalyzePortfolioRisk', {
        fundCodes: fundCodes,
        weights: weights
    });
}

// 持仓诊断
async function diagnosePortfolio(fundCodes, weights) {
    return await mcpCall('DiagnoseFundPortfolio', {
        fundCodes: fundCodes,
        weights: weights
    });
}

// ========== 财经资讯 ==========

// 搜索财经新闻
async function searchFinancialNews(keyword, startDate, endDate, pageSize = 10) {
    return await mcpCall('SearchFinancialNews', {
        keyword: keyword,
        startDate: startDate,
        endDate: endDate,
        pageSize: pageSize
    });
}

// 获取基金经理观点
async function getManagerViewpoints(keyword, pageSize = 10) {
    return await mcpCall('SearchManagerViewpoint', {
        keyword: keyword,
        pageSize: pageSize
    });
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

// 构建带有真实数据的AI提示词
async function buildAIPromptWithRealData(userQuery) {
    const mcpData = await getFundsDataFromQuery(userQuery);
    
    let dataContext = '';
    
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
    
    return {
        mcpData: mcpData,
        dataContext: dataContext
    };
}

// 导出所有函数
window.MCPClient = {
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
    getFundsDataFromQuery,
    buildAIPromptWithRealData
};
