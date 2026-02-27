#!/bin/bash
# Run from repo root. Ensure .env exists with MEGAETH_RPC_URL, SUPABASE_URL, SUPABASE_KEY.
docker container stop vlend-api-prod 2>/dev/null || true
docker container rm vlend-api-prod 2>/dev/null || true
docker build -t vlend-api-prod .
docker run -d -p 3000:3000 --env-file .env --restart=always --name=vlend-api-prod vlend-api-prod
