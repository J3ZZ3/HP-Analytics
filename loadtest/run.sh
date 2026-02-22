#!/usr/bin/env bash
# Load test scripts for HP Analytics API
# Requires: npx autocannon (npm install -g autocannon)
# Run from repo root after 'cd infra && docker compose up --build'

BASE_URL="${BASE_URL:-http://localhost}"
DURATION="${DURATION:-20}"
CONNECTIONS="${CONNECTIONS:-200}"

echo "============================================"
echo " HP Analytics Load Tests"
echo " URL:         $BASE_URL"
echo " Duration:    ${DURATION}s"
echo " Connections: $CONNECTIONS"
echo "============================================"

echo ""
echo "--- Health endpoint (baseline) ---"
npx autocannon -c $CONNECTIONS -d $DURATION "$BASE_URL/health"

echo ""
echo "--- Product listing ---"
npx autocannon -c $CONNECTIONS -d $DURATION "$BASE_URL/products?page=1&limit=20"

echo ""
echo "--- Metrics endpoint ---"
npx autocannon -c $CONNECTIONS -d $DURATION "$BASE_URL/metrics"

echo ""
echo "============================================"
echo " Load tests complete"
echo "============================================"
