// npm i -g pm2 && pm2 start deploy/ecosystem.config.cjs && pm2 save   (ويندوز: pm2-installer لتشغيله مع الجهاز)
module.exports = { apps: [{ name:'bahbah', script:'server.js', node_args:'--env-file=.env',
  max_restarts:20, restart_delay:3000, env:{ NODE_ENV:'production' } },
  { name:'bahbah-backup', script:'backup.js', cron_restart:'0 3 * * *', autorestart:false }] };
