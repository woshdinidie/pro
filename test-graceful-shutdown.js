#!/usr/bin/env node

// 测试优雅关闭功能的脚本
const http = require('http');

console.log('🚀 开始测试优雅关闭功能...');

// 测试步骤
async function testGracefulShutdown() {
  try {
    // 1. 启动服务器（异步）
    console.log('📦 启动服务器...');
    const serverProcess = require('child_process').spawn('node', ['app.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // 监听服务器输出
    serverProcess.stdout.on('data', (data) => {
      console.log(`[服务器输出] ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.log(`[服务器错误] ${data}`);
    });

    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. 测试连接
    console.log('🔍 测试服务器连接...');
    const testRequest = () => {
      return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log('✅ 服务器响应正常:', JSON.parse(data).message);
            resolve();
          });
        });
        req.on('error', reject);
        req.setTimeout(5000);
      });
    };

    await testRequest();

    // 3. 发送 SIGINT 信号（模拟 Ctrl+C）
    console.log('⚡ 发送 SIGINT 信号测试优雅关闭...');
    serverProcess.kill('SIGINT');

    // 4. 等待服务器关闭
    const shutdownPromise = new Promise((resolve) => {
      serverProcess.on('exit', (code, signal) => {
        console.log(`📋 服务器已退出，代码: ${code}, 信号: ${signal}`);
        resolve({ code, signal });
      });
    });

    // 设置超时，如果10秒内没有关闭就强制结束
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log('⚠️  关闭超时，强制结束进程');
        serverProcess.kill('SIGKILL');
        resolve({ code: -1, signal: 'TIMEOUT' });
      }, 10000);
    });

    const result = await Promise.race([shutdownPromise, timeoutPromise]);

    // 5. 立即测试端口释放
    console.log('🔄 测试端口是否已释放...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

    try {
      await testRequest();
      console.log('❌ 测试失败：端口仍被占用，优雅关闭未完全生效');
      return false;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('✅ 测试成功：端口已释放，优雅关闭正常工作');
        return true;
      } else {
        console.log('❓ 连接错误:', error.message);
        return false;
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
    return false;
  }
}

// 运行测试
testGracefulShutdown().then(success => {
  if (success) {
    console.log('🎉 优雅关闭测试通过！');
    process.exit(0);
  } else {
    console.log('💥 优雅关闭测试失败！');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 测试异常:', error);
  process.exit(1);
}); 