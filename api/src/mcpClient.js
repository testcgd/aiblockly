const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class MCPClientManager {
  constructor() {
    this.clients = new Map(); // serverId -> { client, transport, tools, process }
    this.serverConfigs = new Map(); // serverId -> config
    this.connectionTimeout = 10000; // 10 seconds
    this.maxRetries = 3;
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
   * Connect to an MCP server with retry logic
   * @param {string} serverId - Server ID to connect to
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<object>} Connection result with tools list
   */
  async connectToServer(serverId, retryCount = 0) {
    try {
      const config = this.serverConfigs.get(serverId);
      if (!config) {
        throw new Error(`Server configuration not found: ${serverId}`);
      }

      // Check if already connected
      if (this.clients.has(serverId)) {
        const existing = this.clients.get(serverId);

        // Verify connection is still alive
        try {
          await existing.client.listTools();
          return {
            success: true,
            serverId,
            tools: existing.tools || [],
            message: 'Already connected'
          };
        } catch (err) {
          // Connection is dead, clean up and reconnect
          console.log(`[${serverId}] Existing connection is dead, reconnecting...`);
          await this._cleanupConnection(serverId);
        }
      }

      console.log(`[${serverId}] Connecting to MCP server (attempt ${retryCount + 1}/${this.maxRetries + 1})...`);

      // Create transport with error handling
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...config.env }
      });

      // Create client with enhanced error handling
      const client = new Client({
        name: 'aiblockly-client',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Set up error handlers before connecting
      let connectionError = null;
      const errorHandler = (error) => {
        console.error(`[${serverId}] Client error:`, error);
        connectionError = error;
      };

      client.onerror = errorHandler;

      // Connect with timeout
      await Promise.race([
        client.connect(transport),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout)
        )
      ]);

      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check for errors during connection
      if (connectionError) {
        throw connectionError;
      }

      // List available tools
      console.log(`[${serverId}] Listing available tools...`);
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools || [];

      console.log(`[${serverId}] Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);

      // Store client info
      this.clients.set(serverId, {
        client,
        transport,
        tools,
        config,
        connectedAt: new Date(),
        lastUsed: new Date()
      });

      // Set up ongoing error monitoring
      client.onerror = (error) => {
        console.error(`[${serverId}] Runtime error:`, error);
        // Don't auto-cleanup on runtime errors, let user decide
      };

      console.log(`[${serverId}] Successfully connected to MCP server`);

      return {
        success: true,
        serverId,
        tools,
        message: 'Connected successfully',
        toolCount: tools.length
      };

    } catch (error) {
      console.error(`[${serverId}] Failed to connect (attempt ${retryCount + 1}):`, error.message);

      // Clean up failed connection
      await this._cleanupConnection(serverId);

      // Retry if we haven't exceeded max retries
      if (retryCount < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        console.log(`[${serverId}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connectToServer(serverId, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Clean up a connection
   * @param {string} serverId - Server ID
   * @private
   */
  async _cleanupConnection(serverId) {
    const clientInfo = this.clients.get(serverId);
    if (clientInfo) {
      try {
        await clientInfo.client.close();
      } catch (err) {
        // Ignore cleanup errors
        console.error(`[${serverId}] Error during cleanup:`, err.message);
      }
      this.clients.delete(serverId);
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
      console.log(`[${serverId}] Calling tool: ${toolName}`, args);

      // Update last used timestamp
      clientInfo.lastUsed = new Date();

      const result = await clientInfo.client.callTool({
        name: toolName,
        arguments: args
      });

      console.log(`[${serverId}] Tool ${toolName} returned successfully`);

      return {
        success: true,
        result: result.content || result
      };
    } catch (error) {
      console.error(`[${serverId}] Error calling tool ${toolName}:`, error.message);

      // Check if it's a connection error
      if (error.message && error.message.includes('Connection closed')) {
        // Clean up dead connection
        await this._cleanupConnection(serverId);
        throw new Error(`Connection lost to server ${serverId}. Please reconnect.`);
      }

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

  /**
   * Check if a server is connected
   * @param {string} serverId - Server ID
   * @returns {boolean} Connection status
   */
  isConnected(serverId) {
    return this.clients.has(serverId);
  }

  /**
   * Get connection info for a server
   * @param {string} serverId - Server ID
   * @returns {object|null} Connection info
   */
  getConnectionInfo(serverId) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      return null;
    }

    return {
      serverId,
      connectedAt: clientInfo.connectedAt,
      lastUsed: clientInfo.lastUsed,
      toolCount: clientInfo.tools ? clientInfo.tools.length : 0,
      tools: clientInfo.tools
    };
  }

  /**
   * Refresh tools list for a connected server
   * @param {string} serverId - Server ID
   * @returns {Promise<Array>} Updated tools list
   */
  async refreshTools(serverId) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    try {
      console.log(`[${serverId}] Refreshing tools list...`);
      const toolsResponse = await clientInfo.client.listTools();
      const tools = toolsResponse.tools || [];

      clientInfo.tools = tools;
      clientInfo.lastUsed = new Date();

      console.log(`[${serverId}] Refreshed ${tools.length} tools`);
      return tools;
    } catch (error) {
      console.error(`[${serverId}] Error refreshing tools:`, error.message);

      // If connection error, clean up
      if (error.message && error.message.includes('Connection closed')) {
        await this._cleanupConnection(serverId);
        throw new Error(`Connection lost to server ${serverId}. Please reconnect.`);
      }

      throw error;
    }
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll() {
    const serverIds = Array.from(this.clients.keys());
    console.log(`Disconnecting from ${serverIds.length} servers...`);

    for (const serverId of serverIds) {
      try {
        await this.disconnectFromServer(serverId);
      } catch (error) {
        console.error(`Error disconnecting from ${serverId}:`, error.message);
      }
    }

    console.log('All servers disconnected');
  }
}

// Create singleton instance
const mcpClientManager = new MCPClientManager();

module.exports = mcpClientManager;
