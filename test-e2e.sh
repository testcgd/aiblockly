#!/bin/bash

# End-to-End Test Script for AIBlockly MCP Integration
# This script tests the complete MCP integration flow

set -e

echo "================================"
echo "AIBlockly MCP E2E Test"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Test 1: Check if Node.js is installed
echo "Test 1: Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed (version: $NODE_VERSION)"
else
    print_error "Node.js is not installed"
fi
echo ""

# Test 2: Check if dependencies are installed
echo "Test 2: Checking dependencies..."
if [ -d "api/node_modules" ] && [ -d "ui/node_modules" ] && [ -d "test-mcp-server/node_modules" ]; then
    print_success "All dependencies are installed"
else
    print_error "Some dependencies are missing"
    print_info "Installing dependencies..."
    cd api && npm install && cd ..
    cd ui && npm install && cd ..
    cd test-mcp-server && npm install && cd ..
fi
echo ""

# Test 3: Start API server
echo "Test 3: Starting API server..."
cd api
npm start &> /tmp/aiblockly-api.log &
API_PID=$!
cd ..
sleep 3

if ps -p $API_PID > /dev/null; then
    print_success "API server started (PID: $API_PID)"
else
    print_error "Failed to start API server"
    cat /tmp/aiblockly-api.log
fi
echo ""

# Test 4: Test API health endpoint
echo "Test 4: Testing API health endpoint..."
sleep 2
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health || echo "failed")
if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    print_success "API health check passed"
else
    print_error "API health check failed"
fi
echo ""

# Test 5: Test MCP server listing endpoint
echo "Test 5: Testing MCP servers endpoint..."
SERVERS_RESPONSE=$(curl -s http://localhost:3001/api/mcp/servers || echo "failed")
if [[ $SERVERS_RESPONSE == *"success"* ]]; then
    print_success "MCP servers endpoint working"
else
    print_error "MCP servers endpoint failed"
fi
echo ""

# Test 6: Add test MCP server configuration
echo "Test 6: Adding test MCP server..."
ADD_SERVER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/mcp/servers \
    -H "Content-Type: application/json" \
    -d '{
        "serverId": "test-server",
        "name": "Test Server",
        "command": "node",
        "args": ["'$(pwd)'/test-mcp-server/index.js"]
    }' || echo "failed")

if [[ $ADD_SERVER_RESPONSE == *"success"* ]]; then
    print_success "Test MCP server configuration added"
else
    print_error "Failed to add MCP server configuration"
    echo "Response: $ADD_SERVER_RESPONSE"
fi
echo ""

# Test 7: Connect to test MCP server
echo "Test 7: Connecting to test MCP server..."
CONNECT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/mcp/connect \
    -H "Content-Type: application/json" \
    -d '{"serverId": "test-server"}' || echo "failed")

if [[ $CONNECT_RESPONSE == *"success"* ]]; then
    print_success "Connected to test MCP server"
    echo "Response: $CONNECT_RESPONSE"
else
    print_error "Failed to connect to test MCP server"
    echo "Response: $CONNECT_RESPONSE"
fi
echo ""

# Test 8: Get available tools
echo "Test 8: Getting available MCP tools..."
sleep 2
TOOLS_RESPONSE=$(curl -s http://localhost:3001/api/mcp/tools || echo "failed")
if [[ $TOOLS_RESPONSE == *"add_numbers"* ]] && [[ $TOOLS_RESPONSE == *"greet"* ]]; then
    print_success "MCP tools retrieved successfully"
    echo "Tools found: $(echo $TOOLS_RESPONSE | grep -o '"name":"[^"]*"' | head -n 4)"
else
    print_error "Failed to retrieve MCP tools"
    echo "Response: $TOOLS_RESPONSE"
fi
echo ""

# Test 9: Call MCP tool (add_numbers)
echo "Test 9: Calling MCP tool 'add_numbers'..."
CALL_RESPONSE=$(curl -s -X POST http://localhost:3001/api/mcp/call \
    -H "Content-Type: application/json" \
    -d '{
        "serverId": "test-server",
        "toolName": "add_numbers",
        "args": {"a": 5, "b": 3}
    }' || echo "failed")

if [[ $CALL_RESPONSE == *"success"* ]]; then
    print_success "MCP tool 'add_numbers' called successfully"
    echo "Response: $CALL_RESPONSE"
else
    print_error "Failed to call MCP tool 'add_numbers'"
    echo "Response: $CALL_RESPONSE"
fi
echo ""

# Test 10: Call MCP tool (greet)
echo "Test 10: Calling MCP tool 'greet'..."
GREET_RESPONSE=$(curl -s -X POST http://localhost:3001/api/mcp/call \
    -H "Content-Type: application/json" \
    -d '{
        "serverId": "test-server",
        "toolName": "greet",
        "args": {"name": "AIBlockly", "formal": false}
    }' || echo "failed")

if [[ $GREET_RESPONSE == *"success"* ]]; then
    print_success "MCP tool 'greet' called successfully"
    echo "Response: $GREET_RESPONSE"
else
    print_error "Failed to call MCP tool 'greet'"
    echo "Response: $GREET_RESPONSE"
fi
echo ""

# Cleanup
echo "Cleaning up..."
print_info "Stopping API server (PID: $API_PID)..."
kill $API_PID 2>/dev/null || true
sleep 1
print_info "Cleanup complete"
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
fi
