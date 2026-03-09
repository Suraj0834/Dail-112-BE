// =============================================================================
// backend/ecosystem.config.js - PM2 Configuration
// =============================================================================

module.exports = {
    apps: [
        {
            name: 'dial112-api',
            script: './server.js',
            instances: 'max',               // Leverage all available CPU cores
            exec_mode: 'cluster',           // Run multiple node processes
            watch: false,                   // Disable watch mode in production
            max_memory_restart: '1G',       // Graceful reload if memory exceeds 1GB
            env: {
                NODE_ENV: 'development',
                PORT: 5000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/pm2-err.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,
            time: true,
        },
    ],
};
