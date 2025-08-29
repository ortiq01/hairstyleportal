module.exports = {
  apps: [
    {
      name: 'hairstyleportal',
      script: 'index.js',
      env: {
        NODE_ENV: 'development',
        PORT: 3008
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3008
      }
    }
  ]
};
