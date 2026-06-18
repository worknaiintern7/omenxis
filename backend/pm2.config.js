module.exports = {
  apps: [{
    name: 'chess-backend',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
