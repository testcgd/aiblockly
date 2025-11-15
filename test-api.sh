#!/bin/bash

# API Testing Script for AIBlockly MCP Integration
# Tests all API endpoints and generates detailed results

set -e

API_URL="http://localhost:3001"
TEST_RESULTS_DIR="/tmp/aiblockly-api-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p $TEST_RESULTS_DIR

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Output file
OUTPUT_FILE="$TEST_RESULTS_DIR/api_test_results_$TIMESTAMP.txt"

log_test() {
    echo -e "$1" | tee -a $OUTPUT_FILE
}

test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    log_test ""
    log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_test "${BLUE}TEST #$TOTAL_TESTS: $test_name${NC}"
    log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_test "${YELLOW}Method:${NC} $method"
    log_test "${YELLOW}Endpoint:${NC} $endpoint"

    if [ ! -z "$data" ]; then
        log_test "${YELLOW}Request Body:${NC}"
        echo "$data" | jq '.' 2>/dev/null | tee -a $OUTPUT_FILE || echo "$data" | tee -a $OUTPUT_FILE
    fi

    # Make request
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    # Extract HTTP code and body
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    log_test ""
    log_test "${YELLOW}HTTP Status:${NC} $http_code"
    log_test "${YELLOW}Response Body:${NC}"
    echo "$body" | jq '.' 2>/dev/null | tee -a $OUTPUT_FILE || echo "$body" | tee -a $OUTPUT_FILE

    # Check result
    if [[ $http_code == 2* ]] && [[ $body == *"$expected"* ]]; then
        log_test ""
        log_test "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log_test ""
        log_test "${RED}✗ FAILED${NC}"
        log_test "${RED}Expected to contain: $expected${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Start API server
log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_test "${BLUE}AIBlockly MCP API Test Suite${NC}"
log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_test "Timestamp: $(date)"
log_test "API URL: $API_URL"
log_test ""

log_test "${YELLOW}Starting API server...${NC}"
cd /home/user/aiblockly/api
npm start &> /tmp/api-test-server.log &
API_PID=$!
cd /home/user/aiblockly

sleep 3

if ! ps -p $API_PID > /dev/null; then
    log_test "${RED}Failed to start API server${NC}"
    exit 1
fi

log_test "${GREEN}API server started (PID: $API_PID)${NC}"
sleep 2

# Run tests
log_test ""
log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_test "${BLUE}Running API Tests${NC}"
log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Health Check
test_endpoint \
    "Health Check Endpoint" \
    "GET" \
    "/api/health" \
    "" \
    "ok"

# Test 2: Get Servers (initially empty)
test_endpoint \
    "Get MCP Servers List (Empty)" \
    "GET" \
    "/api/mcp/servers" \
    "" \
    "success"

# Test 3: Add Server Configuration
test_endpoint \
    "Add MCP Server Configuration" \
    "POST" \
    "/api/mcp/servers" \
    '{
        "serverId": "test-server-1",
        "name": "Test Server 1",
        "command": "node",
        "args": ["/home/user/aiblockly/test-mcp-server/index.js"]
    }' \
    "success"

# Test 4: Get Servers (with one server)
test_endpoint \
    "Get MCP Servers List (With Server)" \
    "GET" \
    "/api/mcp/servers" \
    "" \
    "test-server-1"

# Test 5: Add Another Server
test_endpoint \
    "Add Second MCP Server Configuration" \
    "POST" \
    "/api/mcp/servers" \
    '{
        "serverId": "test-server-2",
        "name": "Test Server 2",
        "command": "node",
        "args": ["/home/user/aiblockly/test-mcp-server/index.js"]
    }' \
    "success"

# Test 6: Connect to Server
test_endpoint \
    "Connect to MCP Server" \
    "POST" \
    "/api/mcp/connect" \
    '{
        "serverId": "test-server-1"
    }' \
    "success"

sleep 2

# Test 7: Get All Tools
test_endpoint \
    "Get All MCP Tools" \
    "GET" \
    "/api/mcp/tools" \
    "" \
    "tools"

# Test 8: Get Server Specific Tools
test_endpoint \
    "Get Tools for Specific Server" \
    "GET" \
    "/api/mcp/tools/test-server-1" \
    "" \
    "success"

# Test 9: Call MCP Tool - add_numbers
test_endpoint \
    "Call MCP Tool: add_numbers" \
    "POST" \
    "/api/mcp/call" \
    '{
        "serverId": "test-server-1",
        "toolName": "add_numbers",
        "args": {
            "a": 42,
            "b": 58
        }
    }' \
    "success"

# Test 10: Call MCP Tool - greet
test_endpoint \
    "Call MCP Tool: greet (informal)" \
    "POST" \
    "/api/mcp/call" \
    '{
        "serverId": "test-server-1",
        "toolName": "greet",
        "args": {
            "name": "AIBlockly User",
            "formal": false
        }
    }' \
    "success"

# Test 11: Call MCP Tool - greet (formal)
test_endpoint \
    "Call MCP Tool: greet (formal)" \
    "POST" \
    "/api/mcp/call" \
    '{
        "serverId": "test-server-1",
        "toolName": "greet",
        "args": {
            "name": "Distinguished Guest",
            "formal": true
        }
    }' \
    "success"

# Test 12: Call MCP Tool - reverse_string
test_endpoint \
    "Call MCP Tool: reverse_string" \
    "POST" \
    "/api/mcp/call" \
    '{
        "serverId": "test-server-1",
        "toolName": "reverse_string",
        "args": {
            "text": "Hello Blockly MCP!"
        }
    }' \
    "success"

# Test 13: Call MCP Tool - calculate_area
test_endpoint \
    "Call MCP Tool: calculate_area" \
    "POST" \
    "/api/mcp/call" \
    '{
        "serverId": "test-server-1",
        "toolName": "calculate_area",
        "args": {
            "width": 10,
            "height": 5
        }
    }' \
    "success"

# Test 14: Invalid Server ID
test_endpoint \
    "Call Tool with Invalid Server ID" \
    "POST" \
    "/api/mcp/call" \
    '{
        "serverId": "non-existent-server",
        "toolName": "add_numbers",
        "args": {"a": 1, "b": 2}
    }' \
    "error"

# Test 15: Missing Required Parameters
test_endpoint \
    "Add Server without Required Fields" \
    "POST" \
    "/api/mcp/servers" \
    '{
        "serverId": "incomplete-server"
    }' \
    "error"

# Test 16: Disconnect from Server
test_endpoint \
    "Disconnect from MCP Server" \
    "POST" \
    "/api/mcp/disconnect" \
    '{
        "serverId": "test-server-1"
    }' \
    "success"

# Summary
log_test ""
log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_test "${BLUE}Test Summary${NC}"
log_test "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_test ""
log_test "Total Tests:  $TOTAL_TESTS"
log_test "${GREEN}Passed:       $PASSED_TESTS${NC}"
log_test "${RED}Failed:       $FAILED_TESTS${NC}"
log_test ""
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
log_test "Pass Rate:    ${PASS_RATE}%"
log_test ""
log_test "Results saved to: $OUTPUT_FILE"
log_test ""

# Cleanup
log_test "${YELLOW}Stopping API server (PID: $API_PID)...${NC}"
kill $API_PID 2>/dev/null || true
sleep 1

if [ $FAILED_TESTS -eq 0 ]; then
    log_test "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log_test "${GREEN}All tests passed! 🎉${NC}"
    log_test "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    log_test "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log_test "${RED}Some tests failed. Please review the results above.${NC}"
    log_test "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
