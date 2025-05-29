# 🌐 ngrok真实转账测试指南

## 🎯 **当前ngrok配置**
- **HTTPS地址**: `https://6f29-117-139-128-52.ngrok-free.app`
- **本地转发**: `http://localhost:3000`
- **状态**: ✅ 在线运行

## 📋 **微信商户平台配置步骤**

### 1. 配置回调URL
登录微信商户平台，设置以下回调地址：
```
https://6f29-117-139-128-52.ngrok-free.app/api/v1/transfer/wechat/notify
```

### 2. 配置路径
- **产品中心** → **现金红包** → **付款到零钱** → **API设置**
- 或者：**开发配置** → **支付配置** → **Native支付** → **支付回调URL**

### 3. IP白名单（如果需要）
可能需要添加ngrok的出口IP到白名单

## 🚀 **测试选项**

### 选项A：真实转账测试
1. **关闭开发模式**
   ```bash
   # 在 .env 文件中注释或删除这一行
   # WECHAT_DEV_MODE=true
   ```

2. **重启服务器**
   ```bash
   npm start
   ```

3. **进行抽奖测试**
   - 会调用真实微信支付API
   - 如果成功，用户会收到真实红包
   - ⚠️ 注意：这会产生真实的资金转账

### 选项B：保持开发模式
继续使用模拟转账，测试功能流程

## 🔍 **测试验证点**

### 服务器日志
- 查看是否有微信API调用日志
- 检查回调接收情况

### 数据库记录
```sql
-- 查看转账记录
SELECT * FROM transfer_record ORDER BY created_at DESC LIMIT 3;

-- 查看转账日志  
SELECT * FROM transfer_log ORDER BY created_at DESC LIMIT 5;

-- 查看抽奖转账状态
SELECT id, user_id, prize_name, transfer_status, transfer_amount 
FROM lottery_record 
WHERE transfer_status != 'none' 
ORDER BY created_at DESC LIMIT 3;
```

## ⚠️ **注意事项**

1. **资金安全**
   - 真实测试会产生实际转账
   - 建议先用小金额测试

2. **ngrok稳定性**
   - 免费版有时间限制
   - 地址可能会变化，需要重新配置

3. **微信平台配置**
   - 配置更新可能需要几分钟生效
   - 确保商户号有足够余额

## 🎯 **推荐测试流程**

1. **先保持开发模式**，确保ngrok连接正常
2. **配置微信商户平台**回调地址  
3. **关闭开发模式**，进行真实转账测试
4. **监控日志和数据库**，验证结果

## 📞 **如果遇到问题**

1. **检查ngrok状态**：确保在线
2. **检查服务器日志**：查看错误信息
3. **检查微信平台配置**：确保回调地址正确
4. **检查网络连接**：确保微信能访问ngrok地址

---

**当前状态**: ✅ ngrok已启动，等待微信平台配置和测试选择 