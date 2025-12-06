#!/bin/bash
# Correct curl command to register LangchainMCP tool

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWU5N2M4My1jZGJkLTRiMmMtYTNjMi0wODhlNWQxZjMyY2YiLCJlbWFpbCI6IndpbGxpYW10Zmx5bm5AZ21haWwuY29tIiwic3Vic2NyaXB0aW9uVGllciI6IkZyZWUiLCJpYXQiOjE3NjUwMDAyNjAsImV4cCI6MTc2NTYwNTA2MH0.UqRAwKaH0t21xfbnk4uBC3-ErqmgaiH2otBgCdNjZIA"

curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Langchain Agent",
    "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
    "credit_cost_per_call": 5,
    "protocol": "rest"
  }'
