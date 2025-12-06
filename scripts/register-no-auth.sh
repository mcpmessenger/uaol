#!/bin/bash
# Try registration without authentication (since endpoint is public)

echo "Testing registration without authentication..."
echo ""

curl -v -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Langchain Agent",
    "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
    "credit_cost_per_call": 5,
    "protocol": "rest"
  }' \
  --max-time 15 \
  2>&1 | tee registration-output.txt

echo ""
echo ""
echo "Response saved to registration-output.txt"
echo "Check that file for the full response"
