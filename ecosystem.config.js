module.exports = {
  apps: [
    {
      name: 'fin-board',
      script: '.next/standalone/server.js',
      cwd: '/home/user/code/fin_board',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0', // Listen on all interfaces (required for Tailscale)
        DB_PATH: '/home/user/code/fin_board/data/fin_board.db',
      },
      max_memory_restart: '512M',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
