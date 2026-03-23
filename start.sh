#!/bin/bash
cd /home/sprite/songlist-maker/server
export PORT=8080
export NODE_ENV=production
exec node index.js
