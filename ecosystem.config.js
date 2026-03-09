// =============================================================================
// backend/ecosystem.config.js - PM2 Configuration
// =============================================================================

module.exports = {
    apps: [
        {
            name: 'dial112-api',
            script: './src/server.js',
            instances: 1,                   // Free tier: 1 instance
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '400M',
            env: {
                NODE_ENV: 'development',
                PORT: 5001,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5001,
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/pm2-err.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,
            time: true,
        },
    ],
};
