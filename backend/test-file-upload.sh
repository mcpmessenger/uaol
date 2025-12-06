#!/bin/bash
# Simple bash script to test file uploads using curl
# Usage: ./test-file-upload.sh <file-path> [api-url] [token]

FILE_PATH="$1"
API_URL="${2:-http://localhost:3000}"
TOKEN="$3"

if [ -z "$FILE_PATH" ]; then
  echo "❌ Error: File path is required"
  echo ""
  echo "Usage:"
  echo "  ./test-file-upload.sh <file-path> [api-url] [token]"
  echo ""
  echo "Examples:"
  echo "  ./test-file-upload.sh test.pdf"
  echo "  ./test-file-upload.sh document.docx http://localhost:3000"
  echo "  ./test-file-upload.sh sample.txt http://localhost:3000 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "❌ Error: File not found: $FILE_PATH"
  exit 1
fi

echo "📤 Testing File Upload"
echo ""
echo "   File: $FILE_PATH"
echo "   API URL: $API_URL"
echo "   Auth: ${TOKEN:+Authenticated}"
echo ""

# Build curl command
CURL_CMD="curl -X POST \"$API_URL/chat/upload\""

if [ -n "$TOKEN" ]; then
  CURL_CMD="$CURL_CMD -H \"Authorization: Bearer $TOKEN\""
fi

CURL_CMD="$CURL_CMD -F \"files=@$FILE_PATH\""
CURL_CMD="$CURL_CMD -w \"\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n\""

echo "   📡 Uploading..."
echo ""

# Execute curl
eval $CURL_CMD

echo ""
echo "✅ Done!"

