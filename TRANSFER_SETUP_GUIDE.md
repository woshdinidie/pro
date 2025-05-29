# 🚀 微信支付转账功能设置指南

## 📋 第一步：环境准备（✅ 已完成）

✅ **依赖安装完成**
- wechatpay-node-v3: 2.2.1
- bull: 4.12.2 (Redis队列)
- node-cron: 3.0.3 (定时任务)

✅ **目录结构**
```
answer-quiz-backend/
├── certs/                 # 微信支付证书目录
├── config/wechat-pay.js   # 微信支付配置
├── utils/wechatPayService.js    # 微信支付服务
├── utils/transferQueue.js       # 转账队列服务
└── controllers/transferController.js  # 转账控制器
```

✅ **环境变量配置完成**
✅ **证书文件已放置**
✅ **服务启动成功**

## 🔧 第二步：环境变量配置

请在 `.env` 文件中添加以下配置：

```bash
# ============== 微信支付转账配置 ==============
# 微信小程序APPID
WECHAT_APPID=wxYourMiniProgramAppId

# 微信商户号（10位数字）
WECHAT_MCHID=1234567890

# 微信支付APIv3密钥（32位字符）
WECHAT_APIKEY=YourAPIv3Key32CharactersLongString

# Redis转账队列数据库编号
REDIS_TRANSFER_DB=2
```

## 📜 第三步：证书文件配置

从微信商户平台下载证书文件并放入 `certs/` 目录：

### 3.1 登录微信商户平台
- 访问：https://pay.weixin.qq.com
- 使用您的商户账号登录

### 3.2 下载API证书
1. 进入 **账户中心** → **API安全**
2. 点击 **申请API证书**
3. 下载证书压缩包

### 3.3 放置证书文件
将下载的证书文件放入 `certs/` 目录：
```
certs/
├── apiclient_key.pem    # 商户私钥证书
├── apiclient_cert.pem   # 商户证书
└── wechatpay_cert.pem   # 微信支付平台证书（可选，会自动下载）
```

## ⚙️ 第四步：微信商户平台配置

### 4.1 设置API密钥
1. 在 **API安全** 页面点击 **设置APIv3密钥**
2. 设置32位的APIv3密钥
3. 将密钥填入 `.env` 文件的 `WECHAT_APIKEY`

### 4.2 开通转账功能
1. 进入 **产品中心** → **现金红包**
2. 开通 **付款到零钱** 功能
3. 完成相关资质认证

### 4.3 配置回调URL
在 **开发配置** 中设置：
```
https://yourdomain.com/api/transfer/wechat/notify
```

## 🗄️ 第五步：数据库迁移（✅ 已完成）

✅ **数据表创建成功**
- transfer_record (转账记录表)
- transfer_queue (转账队列表)
- transfer_log (转账日志表)

✅ **lottery_record表字段扩展**
- transfer_status 字段已添加
- transfer_amount 字段已添加

## 🚀 第六步：启动服务

```bash
npm run dev
```

## 📊 验证配置

启动后检查日志：
- ✅ 微信支付服务初始化成功
- ✅ 转账队列服务初始化成功
- ⚠️ 如有证书相关警告，请检查证书文件

## 🔧 第三步：API接口验证

现在我们可以测试转账功能的API接口：

### 3.1 测试抽奖功能（创建转账记录）
```bash
# 模拟用户抽中现金奖品，应该自动创建转账记录
POST /api/v1/lottery/start
```

### 3.2 测试转账状态查询
```bash
# 查询转账统计信息
GET /api/v1/transfer/stats

# 查询用户转账记录
GET /api/v1/transfer/records
```

### 3.3 测试微信回调接口
```bash
# 微信支付回调通知接口
POST /api/v1/transfer/wechat/notify
```

## ⚙️ 下一步：功能测试

现在开始测试完整的转账流程：

1. **测试抽奖** → 创建现金奖品转账记录
2. **验证队列** → 检查转账任务是否正确入队
3. **查看日志** → 监控转账处理状态
4. **模拟回调** → 测试微信支付状态更新

---

**当前状态：** ✅ 环境准备完成 ✅ 数据库迁移完成 🔄 准备功能测试

## 🔍 测试流程

1. **测试抽奖功能** - 验证是否正常创建转账记录
2. **检查队列状态** - 访问 `/api/transfer/stats` 查看队列统计
3. **模拟微信回调** - 测试回调接口状态更新

## ⚠️ 安全提醒

- 🔒 妥善保管证书文件和API密钥
- 🌐 生产环境必须使用HTTPS
- 🔄 定期更换API密钥
- 📝 不要将敏感信息提交到代码仓库

## 📞 支持

如遇问题，请检查：
1. 证书文件路径和权限
2. 环境变量配置
3. 微信商户平台设置
4. 网络连接和域名解析

---

**下一步：数据库迁移** → 执行 `migrations/add_transfer_tables.sql`

## 🔧 第三步：功能验证（✅ 已完成）

### 服务状态验证
从服务器日志可以确认：
- ✅ **微信支付服务初始化成功**
- ✅ **Redis连接成功**
- ✅ **转账队列服务已启动**
- ✅ **API路由正确加载**
- ✅ **数据库连接正常**

### API接口可用性
转账功能提供以下API接口：
```bash
# 微信支付回调通知（无需认证）
POST /api/v1/transfer/wechat/notify

# 查询用户转账记录（需要认证）
GET /api/v1/transfer/records

# 重试失败的转账（需要认证）
POST /api/v1/transfer/retry/:transfer_id

# 获取转账统计信息（需要认证）
GET /api/v1/transfer/stats

# 查询特定抽奖的转账状态（需要认证）
GET /api/v1/lottery/transfer-status/:lottery_record_id
```

## 🎯 第四步：实际测试

现在可以开始真实环境测试：

### 4.1 抽奖转账测试
1. **通过小程序进行抽奖** 
   - 用户抽中现金奖品时会自动触发转账流程
   - 系统会创建转账记录并加入队列处理

2. **观察服务器日志**
   - 查看转账记录创建过程
   - 监控队列处理状态
   - 检查微信API调用结果

3. **检查数据库变化**
   ```sql
   -- 查看转账记录
   SELECT * FROM transfer_record ORDER BY created_at DESC LIMIT 10;
   
   -- 查看转账日志
   SELECT * FROM transfer_log ORDER BY created_at DESC LIMIT 10;
   
   -- 查看有转账状态的抽奖记录
   SELECT * FROM lottery_record WHERE transfer_status != 'none' ORDER BY created_at DESC LIMIT 10;
   ```

### 4.2 预期转账流程

当用户抽中现金奖品时，系统会：

1. **立即响应用户** ⚡
   - 告知用户抽中奖品
   - 显示"转账处理中"状态
   
2. **异步处理转账** 🔄
   - 创建转账记录
   - 加入Redis队列
   - 后台调用微信支付API
   
3. **状态更新** 📱
   - 用户可查询转账进度
   - 微信回调更新最终状态
   - 支持失败重试机制

### 4.3 测试检查点

- [ ] 用户抽中现金奖品后，`lottery_record.transfer_status` 应为 `pending`
- [ ] `transfer_record` 表中应创建对应记录
- [ ] `transfer_log` 表中应有操作日志  
- [ ] 服务器日志中应有转账处理信息
- [ ] 队列处理应该正常工作（除非微信支付未开通）

## ⚠️ 注意事项

### 开发环境测试
- 当前配置的微信商户号和API密钥需要是真实有效的
- 如果微信支付功能未开通，转账会失败但不影响其他功能
- 建议先在测试环境验证完整流程

### 生产环境部署
1. 确保微信商户平台已开通"付款到零钱"功能
2. 配置正确的回调URL：`https://yourdomain.com/api/v1/transfer/wechat/notify`
3. 使用HTTPS协议
4. 定期监控转账成功率和失败原因

---

**当前状态：** ✅ 环境准备完成 ✅ 数据库迁移完成 ✅ 功能验证完成 🎯 **准备实际测试**

**下一步：** 通过小程序进行真实抽奖测试，验证完整的转账流程 