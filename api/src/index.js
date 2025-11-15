const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const mcpClientManager = require('./mcpClient');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MCP Routes

// Get list of configured MCP servers
app.get('/api/mcp/servers', (req, res) => {
  try {
    const servers = mcpClientManager.getServerList();
    res.json({ success: true, servers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a new MCP server configuration
app.post('/api/mcp/servers', (req, res) => {
  try {
    const { serverId, name, command, args, env } = req.body;

    if (!serverId || !command) {
      return res.status(400).json({
        success: false,
        error: 'serverId and command are required'
      });
    }

    mcpClientManager.addServerConfig(serverId, { name, command, args, env });
    res.json({ success: true, message: 'Server configuration added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connect to an MCP server
app.post('/api/mcp/connect', async (req, res) => {
  try {
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    const result = await mcpClientManager.connectToServer(serverId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect from an MCP server
app.post('/api/mcp/disconnect', async (req, res) => {
  try {
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    const result = await mcpClientManager.disconnectFromServer(serverId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all available tools from all connected servers
app.get('/api/mcp/tools', (req, res) => {
  try {
    const tools = mcpClientManager.getAllTools();
    res.json({ success: true, tools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tools for a specific server
app.get('/api/mcp/tools/:serverId', (req, res) => {
  try {
    const { serverId } = req.params;
    const tools = mcpClientManager.getServerTools(serverId);
    res.json({ success: true, serverId, tools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Call an MCP tool
app.post('/api/mcp/call', async (req, res) => {
  try {
    const { serverId, toolName, args } = req.body;

    if (!serverId || !toolName) {
      return res.status(400).json({
        success: false,
        error: 'serverId and toolName are required'
      });
    }

    const result = await mcpClientManager.callTool(serverId, toolName, args || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`MCP integration enabled`);
}); 