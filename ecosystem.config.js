module.exports = {
  apps: [
    {
      name: 'answer-quiz-backend',
      script: 'app.js',
      cwd: '/path/to/your/answer-quiz-backend',
      instances: 'max', // 或者设置具体数字，如 2
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      // 健康检查
      health_check_grace_period: 3000,
      // 优雅关闭
      kill_timeout: 5000,
      // 监听文件变化（开发环境）
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      // 环境变量文件
      env_file: '.env'
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPOSITORY_URL',
      path: '/var/www/answer-quiz-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 