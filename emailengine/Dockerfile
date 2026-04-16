FROM postalsys/emailengine:latest
CMD ["sh", "-c", "node --max-old-space-size=400 server.js --dbs.redis=$EENGINE_REDIS --api.port=${PORT:-10000} --api.host=0.0.0.0 --workers.imap=1 --workers.webhooks=1 --workers.submission=1"]
