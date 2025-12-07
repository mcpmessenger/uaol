#!/bin/bash

# Helper script to register the Google Places MCP service as a tool in UAOL
# 
# Usage:
#   ./scripts/register-google-places.sh [options]
# 
# Options:
#   --url <url>          Google Places service URL (default: http://localhost:8932)
#   --name <name>        Tool name (default: "Google Places API")
#   --protocol <proto>   Protocol: json-rpc or rest (default: rest)
#   --cost <number>      Credit cost per call (default: 1)
#   --token <token>      JWT token for authentication
#   --api-url <url>      UAOL API Gateway URL (default: http://localhost:3000)

set -e

# Default values
SERVICE_URL="${SERVICE_URL:-http://localhost:8932}"
TOOL_NAME="${TOOL_NAME:-Google Places API}"
PROTOCOL="${PROTOCOL:-rest}"
COST="${COST:-1}"
API_URL="${API_URL:-http://localhost:3000}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --url)
      SERVICE_URL="$2"
      shift 2
      ;;
    --name)
      TOOL_NAME="$2"
      shift 2
      ;;
    --protocol)
      PROTOCOL="$2"
      shift 2
      ;;
    --cost)
      COST="$2"
      shift 2
      ;;
    --token)
      JWT_TOKEN="$2"
      shift 2
      ;;
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Get token from environment or .env file
if [ -z "$JWT_TOKEN" ]; then
  if [ -f "../.env" ]; then
    JWT_TOKEN=$(grep JWT_TOKEN ../.env | cut -d '=' -f2 | tr -d ' "')
  fi
  
  if [ -z "$JWT_TOKEN" ] && [ -n "${JWT_TOKEN_ENV}" ]; then
    JWT_TOKEN="$JWT_TOKEN_ENV"
  fi
fi

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Error: JWT token is required"
  echo "   Provide it via --token option, JWT_TOKEN env var, or .env file"
  exit 1
fi

echo "🚀 Registering Google Places MCP service..."
echo "   Name: $TOOL_NAME"
echo "   Gateway URL: $SERVICE_URL"
echo "   Protocol: $PROTOCOL"
echo "   Credit Cost: $COST"
echo ""

# Register the tool
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/tools" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"name\": \"$TOOL_NAME\",
    \"gateway_url\": \"$SERVICE_URL\",
    \"credit_cost_per_call\": $COST,
    \"protocol\": \"$PROTOCOL\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  TOOL_ID=$(echo "$BODY" | grep -o '"tool_id":"[^"]*' | cut -d'"' -f4)
  echo "✅ Tool registered successfully!"
  echo "   Tool ID: $TOOL_ID"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Approve the tool:"
  echo "      curl -X POST $API_URL/tools/$TOOL_ID/approve -H \"Authorization: Bearer $JWT_TOKEN\""
  echo "   2. Or approve it via the frontend UI"
  echo "   3. The tool will be available in workflow builder once approved"
else
  echo "❌ Registration failed (HTTP $HTTP_CODE):"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
