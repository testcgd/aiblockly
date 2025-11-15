const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

class MCPClientManager {
  constructor() {
    this.clients = new Map(); // serverId -> { client, transport, tools }
    this.serverConfigs = new Map(); // serverId -> config
  }

  /**
   * Add a server configuration
   * @param {string} serverId - Unique identifier for the server
   * @param {object} config - Server configuration { command, args, env }
   */
  addServerConfig(serverId, config) {
    this.serverConfigs.set(serverId, config);
  }

  /**
   * Connect to an MCP server
   * @param {string} serverId - Server ID to connect to
   * @returns {Promise<object>} Connection result with tools list
   */
  async connectToServer(serverId) {
    try {
      const config = this.serverConfigs.get(serverId);
      if (!config) {
        throw new Error(`Server configuration not found: ${serverId}`);
      }

      // Check if already connected
      if (this.clients.has(serverId)) {
        const existing = this.clients.get(serverId);
        return {
          success: true,
          serverId,
          tools: existing.tools || [],
          message: 'Already connected'
        };
      }

      // Create transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...config.env }
      });

      // Create client
      const client = new Client({
        name: 'aiblockly-client',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Connect
      await client.connect(transport);

      // List available tools
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools || [];

      // Store client info
      this.clients.set(serverId, {
        client,
        transport,
        tools,
        config
      });

      console.log(`Connected to MCP server: ${serverId}`);
      console.log(`Available tools: ${tools.map(t => t.name).join(', ')}`);

      return {
        success: true,
        serverId,
        tools,
        message: 'Connected successfully'
      };
    } catch (error) {
      console.error(`Failed to connect to server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   * @param {string} serverId - Server ID to disconnect from
   */
  async disconnectFromServer(serverId) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      return { success: false, message: 'Server not connected' };
    }

    try {
      await clientInfo.client.close();
      this.clients.delete(serverId);
      return { success: true, message: 'Disconnected successfully' };
    } catch (error) {
      console.error(`Error disconnecting from ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Get all available tools from connected servers
   * @returns {Array} List of all tools with server info
   */
  getAllTools() {
    const allTools = [];

    for (const [serverId, clientInfo] of this.clients.entries()) {
      const tools = clientInfo.tools || [];
      tools.forEach(tool => {
        allTools.push({
          serverId,
          serverName: clientInfo.config.name || serverId,
          ...tool
        });
      });
    }

    return allTools;
  }

  /**
   * Call an MCP tool
   * @param {string} serverId - Server ID
   * @param {string} toolName - Tool name
   * @param {object} args - Tool arguments
   * @returns {Promise<object>} Tool result
   */
  async callTool(serverId, toolName, args = {}) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    try {
      const result = await clientInfo.client.callTool({
        name: toolName,
        arguments: args
      });

      return {
        success: true,
        result: result.content || result
      };
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Get list of configured servers
   * @returns {Array} List of server configurations
   */
  getServerList() {
    const servers = [];
    for (const [serverId, config] of this.serverConfigs.entries()) {
      const isConnected = this.clients.has(serverId);
      const toolCount = isConnected ? (this.clients.get(serverId).tools || []).length : 0;

      servers.push({
        id: serverId,
        name: config.name || serverId,
        command: config.command,
        isConnected,
        toolCount
      });
    }
    return servers;
  }

  /**
   * Get tools for a specific server
   * @param {string} serverId - Server ID
   * @returns {Array} List of tools
   */
  getServerTools(serverId) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      return [];
    }
    return clientInfo.tools || [];
  }
}

// Create singleton instance
const mcpClientManager = new MCPClientManager();

module.exports = mcpClientManager;
