// DYOR合约调用脚本 - 转入1 OKB
// 合约地址: 0xc4cebdf3d4bbf14812dccb1ccb20ab26ea547f44
// FunMethodID: 0x51b401a0

const { ethers } = require('ethers');

// 配置信息
const CONTRACT_ADDRESS = "0xc4cebdf3d4bbf14812dccb1ccb20ab26ea547f44";
const FUN_METHOD_ID = "0x51b401a0";
const AMOUNT_OKB = "1.0"; // 1 OKB
const PRIVATE_KEY = "0x24175e4a8aafe388848c1dbffa08d896d128653c6fec0690d674cc32c2cb87de"; // 从1。txt文件读取

// OKC网络配置
const OKC_CONFIG = {
    chainId: '0x42', // 66 in decimal
    chainName: 'OKC',
    nativeCurrency: { 
        name: 'OKB', 
        symbol: 'OKB', 
        decimals: 18 
    },
    rpcUrls: ['https://exchainrpc.okex.org'],
    blockExplorerUrls: ['https://www.oklink.com/okc']
};

// 合约ABI (简化版，只包含我们需要的方法)
const CONTRACT_ABI = [
    "function fun() payable",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)"
];

async function callDYORContract() {
    try {
        console.log("🚀 开始调用DYOR合约...");
        
        // 创建provider和signer
        const provider = new ethers.JsonRpcProvider(OKC_CONFIG.rpcUrls[0]);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log("📝 钱包地址:", wallet.address);
        
        // 检查网络
        const network = await provider.getNetwork();
        console.log("🌐 当前网络:", network.name, "Chain ID:", network.chainId.toString());
        
        if (network.chainId.toString() !== '66') {
            throw new Error("请切换到OKC网络 (Chain ID: 66)");
        }
        
        // 检查余额
        const balance = await provider.getBalance(wallet.address);
        const balanceInOKB = ethers.formatEther(balance);
        console.log("💰 当前OKB余额:", balanceInOKB);
        
        if (parseFloat(balanceInOKB) < parseFloat(AMOUNT_OKB)) {
            throw new Error(`余额不足，需要至少 ${AMOUNT_OKB} OKB`);
        }
        
        // 创建合约实例
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
        
        // 准备交易参数
        const amount = ethers.parseEther(AMOUNT_OKB);
        const gasLimit = 300000; // 预估gas限制
        const gasPrice = await provider.getGasPrice();
        
        console.log("📊 交易参数:");
        console.log("  - 合约地址:", CONTRACT_ADDRESS);
        console.log("  - 转入金额:", AMOUNT_OKB, "OKB");
        console.log("  - Gas价格:", ethers.formatUnits(gasPrice, 'gwei'), "Gwei");
        console.log("  - Gas限制:", gasLimit);
        
        // 估算gas费用
        const estimatedGas = await contract.fun.estimateGas({ value: amount });
        console.log("⛽ 预估Gas:", estimatedGas.toString());
        
        // 发送交易
        console.log("📤 发送交易中...");
        const tx = await contract.fun({
            value: amount,
            gasLimit: gasLimit,
            gasPrice: gasPrice
        });
        
        console.log("📋 交易哈希:", tx.hash);
        console.log("⏳ 等待交易确认...");
        
        // 等待交易确认
        const receipt = await tx.wait();
        
        console.log("✅ 交易成功!");
        console.log("📋 交易详情:");
        console.log("  - 交易哈希:", receipt.hash);
        console.log("  - 区块号:", receipt.blockNumber);
        console.log("  - Gas使用量:", receipt.gasUsed.toString());
        console.log("  - 状态:", receipt.status === 1 ? "成功" : "失败");
        
        // 检查交易后的余额
        const newBalance = await provider.getBalance(wallet.address);
        const newBalanceInOKB = ethers.formatEther(newBalance);
        console.log("💰 交易后OKB余额:", newBalanceInOKB);
        
        return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
        
    } catch (error) {
        console.error("❌ 交易失败:", error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error("💡 建议: 请确保钱包有足够的OKB余额");
        } else if (error.code === 'NETWORK_ERROR') {
            console.error("💡 建议: 请检查网络连接");
        } else if (error.message.includes('user rejected')) {
            console.error("💡 建议: 用户取消了交易");
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

// 批量调用函数 (可选)
async function batchCallDYOR(amount, count) {
    console.log(`🔄 开始批量调用 ${count} 次，每次 ${amount} OKB`);
    
    const results = [];
    for (let i = 0; i < count; i++) {
        console.log(`\n--- 第 ${i + 1}/${count} 次调用 ---`);
        const result = await callDYORContract();
        results.push(result);
        
        if (!result.success) {
            console.log("❌ 批量调用中断");
            break;
        }
        
        // 等待一段时间再继续下一次调用
        if (i < count - 1) {
            console.log("⏳ 等待5秒后继续...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log("\n📊 批量调用结果汇总:");
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 成功: ${successCount}/${count}`);
    console.log(`❌ 失败: ${count - successCount}/${count}`);
    
    return results;
}

// 主函数
async function main() {
    console.log("🎯 DYOR合约调用脚本");
    console.log("=" .repeat(50));
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // 单次调用
        await callDYORContract();
    } else if (args[0] === 'batch' && args.length >= 3) {
        // 批量调用: node script.js batch 1.0 5
        const amount = args[1];
        const count = parseInt(args[2]);
        await batchCallDYOR(amount, count);
    } else {
        console.log("使用方法:");
        console.log("  单次调用: node dyor_contract_call.js");
        console.log("  批量调用: node dyor_contract_call.js batch <金额> <次数>");
        console.log("  例如: node dyor_contract_call.js batch 1.0 5");
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    callDYORContract,
    batchCallDYOR,
    CONTRACT_ADDRESS,
    FUN_METHOD_ID
};
