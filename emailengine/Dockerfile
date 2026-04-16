FROM postalsys/emailengine:latest
CMD ["sh", "-c", "node server.js --dbs.redis=$EENGINE_REDIS --api.port=${PORT:-3000} --api.host=0.0.0.0"]
