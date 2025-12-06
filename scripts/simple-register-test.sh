#!/bin/bash
# Simple test - check if we can reach the endpoint at all

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWU5N2M4My1jZGJkLTRiMmMtYTNjMi0wODhlNWQxZjMyY2YiLCJlbWFpbCI6IndpbGxpYW10Zmx5bm5AZ21haWwuY29tIiwic3Vic2NyaXB0aW9uVGllciI6IkZyZWUiLCJpYXQiOjE3NjUwMDAyNjAsImV4cCI6MTc2NTYwNTA2MH0.UqRAwKaH0t21xfbnk4uBC3-ErqmgaiH2otBgCdNjZIA"

echo "Testing connection..."
echo ""

# Test 1: Can we reach the API Gateway?
echo "1. Testing API Gateway health..."
curl -v http://localhost:3000/health 2>&1 | head -20
echo ""
echo ""

# Test 2: Can we list tools?
echo "2. Testing GET /tools (should work without auth)..."
curl -v http://localhost:3000/tools 2>&1 | head -30
echo ""
echo ""

# Test 3: Try registration with verbose output
echo "3. Testing POST /tools with authentication..."
echo "Sending request..."
curl -v -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Langchain Agent","gateway_url":"https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp","credit_cost_per_call":5,"protocol":"rest"}' \
  --max-time 15 \
  2>&1

echo ""
echo ""
echo "Done!"
