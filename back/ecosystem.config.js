module.exports = {
  apps: [
    {
      name: 'tmw-back',
      script: './server.js',

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      instances: 1,
      autorestart: true,
      watch: true,
      ignore_watch: ['node_modules', 'tests', 'files'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_tenant: {
        NODE_ENV: 'tenant',
        TMW_REQUIRE_BUCKET: 'yes',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
