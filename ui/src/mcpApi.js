import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * MCP API client
 */
class MCPApi {
  /**
   * Get list of configured MCP servers
   */
  async getServers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/mcp/servers`);
      return response.data;
    } catch (error) {
      console.error('Failed to get MCP servers:', error);
      throw error;
    }
  }

  /**
   * Add a new MCP server configuration
   * @param {object} config - Server configuration
   */
  async addServer(config) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mcp/servers`, config);
      return response.data;
    } catch (error) {
      console.error('Failed to add MCP server:', error);
      throw error;
    }
  }

  /**
   * Connect to an MCP server
   * @param {string} serverId - Server ID
   */
  async connectToServer(serverId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mcp/connect`, {
        serverId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   * @param {string} serverId - Server ID
   */
  async disconnectFromServer(serverId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mcp/disconnect`, {
        serverId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to disconnect from MCP server:', error);
      throw error;
    }
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/mcp/tools`);
      return response.data;
    } catch (error) {
      console.error('Failed to get MCP tools:', error);
      throw error;
    }
  }

  /**
   * Get tools for a specific server
   * @param {string} serverId - Server ID
   */
  async getServerTools(serverId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/mcp/tools/${serverId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get server tools:', error);
      throw error;
    }
  }

  /**
   * Call an MCP tool
   * @param {string} serverId - Server ID
   * @param {string} toolName - Tool name
   * @param {object} args - Tool arguments
   */
  async callTool(serverId, toolName, args = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mcp/call`, {
        serverId,
        toolName,
        args
      });
      return response.data;
    } catch (error) {
      console.error('Failed to call MCP tool:', error);
      throw error;
    }
  }
}

// Create singleton instance
const mcpApi = new MCPApi();

// Make API available globally for Blockly generated code
if (typeof window !== 'undefined') {
  window.mcpApi = mcpApi;

  // Helper functions for generated code
  window.connectToMCPServer = async (serverId) => {
    return await mcpApi.connectToServer(serverId);
  };

  window.getMCPTools = async () => {
    const result = await mcpApi.getAllTools();
    return result.tools || [];
  };

  window.callMCPTool = async (serverId, toolName, args) => {
    const result = await mcpApi.callTool(serverId, toolName, args);
    return result.result;
  };
}

export default mcpApi;
