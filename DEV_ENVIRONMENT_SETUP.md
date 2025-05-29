# 🛠️ 开发环境微信支付配置指南

## 🚨 **当前问题分析**

从您的测试结果看到：
- ✅ 抽奖功能正常工作
- ✅ 转账记录创建成功  
- ❌ 转账任务处理失败（错误码：1）

## 🔧 **问题原因**

### 1. **HTTPS协议要求**
微信支付API要求必须使用HTTPS协议，而您当前使用的是HTTP `http://127.0.0.1:3000`

### 2. **IP地址配置问题**
微信支付平台配置的IP `127.0.0.1` 只能本地访问，微信服务器无法回调

### 3. **可能的证书或密钥问题**
需要验证微信商户平台的配置是否正确

## 🛠️ **开发环境解决方案**

### 方案1：使用内网穿透（推荐开发测试）

#### 1.1 安装 ngrok
```bash
# 下载 ngrok
# 访问 https://ngrok.com/ 注册并下载

# 启动内网穿透
ngrok http 3000
```

#### 1.2 获取HTTPS地址
ngrok会提供类似的地址：
```
https://abcd1234.ngrok.io -> http://localhost:3000
```

#### 1.3 更新微信商户平台配置
在微信商户平台配置：
- **回调URL**: `https://abcd1234.ngrok.io/api/v1/transfer/wechat/notify`
- **授权IP**: ngrok提供的IP地址

### 方案2：开发环境模拟模式

#### 2.1 修改转账队列服务
创建开发环境的模拟模式，跳过真实的微信API调用：

```javascript
// 在 utils/transferQueue.js 中添加开发模式
if (process.env.NODE_ENV === 'development' && process.env.WECHAT_DEV_MODE === 'true') {
  // 模拟转账成功
  logger.info(`[开发模式] 模拟转账成功: ${amount}元`);
  return {
    success: true,
    data: { batch_id: 'DEV_' + Date.now() },
    batchId: 'DEV_' + Date.now()
  };
}
```

#### 2.2 在.env中启用开发模式
```bash
# 添加到 .env 文件
WECHAT_DEV_MODE=true
```

### 方案3：使用微信支付沙箱环境

#### 3.1 申请沙箱环境
1. 登录微信商户平台
2. 进入开发配置 → API安全 → 沙箱环境
3. 获取沙箱商户号和密钥

#### 3.2 配置沙箱参数
```bash
# 沙箱环境配置
WECHAT_MCHID=沙箱商户号
WECHAT_APIKEY=沙箱密钥
WECHAT_SANDBOX=true
```

## 🚀 **立即可用的解决方案**

让我为您创建一个开发模式的补丁，使转账功能在开发环境下可以正常工作：

### 步骤1：启用开发模式
在`.env`文件中添加：
```bash
# 开发环境转账模拟模式
WECHAT_DEV_MODE=true
NODE_ENV=development
```

### 步骤2：重启服务
重启后，转账功能将在开发模式下模拟成功

### 步骤3：测试验证
再次进行抽奖测试，应该能看到转账成功的日志

## 📋 **生产环境配置清单**

当您准备部署到生产环境时：

- [ ] 配置HTTPS证书
- [ ] 使用真实域名（如：`https://yourdomain.com`）
- [ ] 在微信商户平台配置正确的回调URL
- [ ] 配置服务器公网IP白名单
- [ ] 开通"付款到零钱"功能
- [ ] 设置合理的转账限额

## 🔍 **调试工具**

### 查看转账记录
```sql
SELECT * FROM transfer_record ORDER BY created_at DESC LIMIT 5;
```

### 查看转账日志
```sql  
SELECT * FROM transfer_log ORDER BY created_at DESC LIMIT 10;
```

### 查看抽奖记录转账状态
```sql
SELECT id, user_id, prize_name, transfer_status, transfer_amount 
FROM lottery_record 
WHERE transfer_status != 'none' 
ORDER BY created_at DESC LIMIT 5;
```

## 📞 **下一步行动**

选择一个方案：
1. **快速测试**：启用开发模式（推荐）
2. **真实环境测试**：配置ngrok + 更新微信平台配置
3. **沙箱测试**：申请并配置微信支付沙箱

您希望先尝试哪个方案？ 