#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

/**
 * Test MCP Server for AIBlockly
 * Provides simple tools for testing the Blockly integration
 */

// Create server instance
const server = new Server(
  {
    name: 'test-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define test tools
const tools = [
  {
    name: 'add_numbers',
    description: 'Add two numbers together',
    inputSchema: {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          description: 'First number'
        },
        b: {
          type: 'number',
          description: 'Second number'
        }
      },
      required: ['a', 'b']
    }
  },
  {
    name: 'greet',
    description: 'Generate a greeting message',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet'
        },
        formal: {
          type: 'boolean',
          description: 'Use formal greeting'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'reverse_string',
    description: 'Reverse a string',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to reverse'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'calculate_area',
    description: 'Calculate the area of a rectangle',
    inputSchema: {
      type: 'object',
      properties: {
        width: {
          type: 'number',
          description: 'Width of the rectangle'
        },
        height: {
          type: 'number',
          description: 'Height of the rectangle'
        }
      },
      required: ['width', 'height']
    }
  }
];

// Handle list tools request
server.setRequestHandler('tools/list', async () => {
  return { tools };
});

// Handle tool call request
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[Test MCP Server] Tool called: ${name}`, args);

  try {
    let result;

    switch (name) {
      case 'add_numbers':
        result = {
          sum: args.a + args.b,
          operation: `${args.a} + ${args.b} = ${args.a + args.b}`
        };
        break;

      case 'greet':
        if (args.formal) {
          result = {
            greeting: `Good day, ${args.name}. It is a pleasure to meet you.`
          };
        } else {
          result = {
            greeting: `Hello, ${args.name}!`
          };
        }
        break;

      case 'reverse_string':
        result = {
          original: args.text,
          reversed: args.text.split('').reverse().join('')
        };
        break;

      case 'calculate_area':
        result = {
          width: args.width,
          height: args.height,
          area: args.width * args.height,
          perimeter: 2 * (args.width + args.height)
        };
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    console.error(`[Test MCP Server] Result:`, result);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(`[Test MCP Server] Error:`, error);
    throw error;
  }
});

// Start the server
async function main() {
  console.error('[Test MCP Server] Starting...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Test MCP Server] Connected and ready');
  console.error(`[Test MCP Server] Available tools: ${tools.map(t => t.name).join(', ')}`);
}

main().catch((error) => {
  console.error('[Test MCP Server] Fatal error:', error);
  process.exit(1);
});
