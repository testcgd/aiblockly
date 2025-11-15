import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

/**
 * Create a Blockly block definition from an MCP tool
 * @param {object} tool - MCP tool definition
 * @returns {string} Block type name
 */
export function createBlockFromMCPTool(tool) {
  const blockType = `mcp_${tool.serverId}_${tool.name}`;

  // Parse input schema to create block inputs
  const inputSchema = tool.inputSchema || {};
  const properties = inputSchema.properties || {};
  const required = inputSchema.required || [];

  // Create block definition
  Blockly.Blocks[blockType] = {
    init: function() {
      this.setColour(290); // Purple color for MCP blocks
      this.setTooltip(tool.description || `Call MCP tool: ${tool.name}`);
      this.setHelpUrl('');

      // Set the block's title
      this.appendDummyInput()
        .appendField(`🔧 ${tool.serverName || tool.serverId}`)
        .appendField(tool.name);

      // Add inputs for each parameter
      let inputIndex = 0;
      for (const [paramName, paramDef] of Object.entries(properties)) {
        const isRequired = required.includes(paramName);
        const paramType = paramDef.type || 'string';
        const paramDesc = paramDef.description || paramName;

        // Create appropriate input based on type
        if (paramType === 'boolean') {
          this.appendValueInput(`ARG_${inputIndex}`)
            .setCheck('Boolean')
            .appendField(`${paramName}${isRequired ? '*' : ''}`);
        } else if (paramType === 'number' || paramType === 'integer') {
          this.appendValueInput(`ARG_${inputIndex}`)
            .setCheck('Number')
            .appendField(`${paramName}${isRequired ? '*' : ''}`);
        } else if (paramType === 'object' || paramType === 'array') {
          this.appendValueInput(`ARG_${inputIndex}`)
            .setCheck(null)
            .appendField(`${paramName}${isRequired ? '*' : ''} (JSON)`);
        } else {
          // Default to string
          this.appendValueInput(`ARG_${inputIndex}`)
            .setCheck(['String', 'Number'])
            .appendField(`${paramName}${isRequired ? '*' : ''}`);
        }

        inputIndex++;
      }

      // Set output or statement configuration
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setOutput(false);

      // Store metadata
      this.mcpToolData = {
        serverId: tool.serverId,
        toolName: tool.name,
        parameters: Object.keys(properties),
        inputSchema
      };
    }
  };

  // Create JavaScript code generator
  javascriptGenerator.forBlock[blockType] = function(block, generator) {
    const toolData = block.mcpToolData;
    const args = {};

    // Collect argument values
    toolData.parameters.forEach((paramName, index) => {
      const valueCode = generator.valueToCode(
        block,
        `ARG_${index}`,
        javascriptGenerator.ORDER_NONE
      );
      if (valueCode) {
        args[paramName] = valueCode;
      }
    });

    // Generate async function call code
    const argsJson = JSON.stringify(args, null, 2);
    const code = `await callMCPTool('${toolData.serverId}', '${toolData.toolName}', ${argsJson});\n`;

    return code;
  };

  return blockType;
}

/**
 * Create a simple MCP tool call block (alternative simpler version)
 * @param {object} tool - MCP tool definition
 * @returns {string} Block type name
 */
export function createSimpleMCPBlock(tool) {
  const blockType = `mcp_simple_${tool.serverId}_${tool.name}`;

  Blockly.Blocks[blockType] = {
    init: function() {
      this.setColour(290);
      this.setTooltip(tool.description || `Call MCP tool: ${tool.name}`);

      // Just show tool name and a JSON input for arguments
      this.appendDummyInput()
        .appendField(`🔧 ${tool.name}`);

      this.appendValueInput('ARGS')
        .setCheck(null)
        .appendField('arguments (JSON)');

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);

      this.mcpToolData = {
        serverId: tool.serverId,
        toolName: tool.name
      };
    }
  };

  javascriptGenerator.forBlock[blockType] = function(block, generator) {
    const toolData = block.mcpToolData;
    const argsCode = generator.valueToCode(
      block,
      'ARGS',
      javascriptGenerator.ORDER_NONE
    ) || '{}';

    const code = `await callMCPTool('${toolData.serverId}', '${toolData.toolName}', ${argsCode});\n`;
    return code;
  };

  return blockType;
}

/**
 * Create all blocks for a list of MCP tools
 * @param {Array} tools - Array of MCP tool definitions
 * @returns {Array} Array of created block types
 */
export function createBlocksFromMCPTools(tools) {
  const blockTypes = [];

  tools.forEach(tool => {
    try {
      const blockType = createBlockFromMCPTool(tool);
      blockTypes.push({
        type: blockType,
        tool: tool
      });
    } catch (error) {
      console.error(`Failed to create block for tool ${tool.name}:`, error);
    }
  });

  return blockTypes;
}

/**
 * Generate toolbox category for MCP tools
 * @param {Array} tools - Array of MCP tool definitions
 * @returns {object} Toolbox category definition
 */
export function generateMCPToolboxCategory(tools) {
  // Group tools by server
  const serverGroups = {};

  tools.forEach(tool => {
    const serverName = tool.serverName || tool.serverId;
    if (!serverGroups[serverName]) {
      serverGroups[serverName] = [];
    }
    serverGroups[serverName].push(tool);
  });

  // Create categories for each server
  const categories = [];

  for (const [serverName, serverTools] of Object.entries(serverGroups)) {
    const blocks = createBlocksFromMCPTools(serverTools);

    categories.push({
      kind: 'category',
      name: `MCP: ${serverName}`,
      colour: 290,
      contents: blocks.map(b => ({
        kind: 'block',
        type: b.type
      }))
    });
  }

  // If only one server, return flat category, otherwise return subcategories
  if (categories.length === 1) {
    return {
      kind: 'category',
      name: 'MCP Tools',
      colour: 290,
      contents: categories[0].contents
    };
  } else if (categories.length > 1) {
    return {
      kind: 'category',
      name: 'MCP Tools',
      colour: 290,
      contents: categories
    };
  }

  return null;
}

/**
 * Create a helper block for MCP server connection
 */
export function createMCPConnectionBlocks() {
  // Connect to MCP server block
  Blockly.Blocks['mcp_connect'] = {
    init: function() {
      this.setColour(290);
      this.setTooltip('Connect to an MCP server');

      this.appendDummyInput()
        .appendField('Connect to MCP server');

      this.appendValueInput('SERVER_ID')
        .setCheck('String')
        .appendField('Server ID');

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
    }
  };

  javascriptGenerator.forBlock['mcp_connect'] = function(block, generator) {
    const serverId = generator.valueToCode(
      block,
      'SERVER_ID',
      javascriptGenerator.ORDER_NONE
    ) || '""';

    return `await connectToMCPServer(${serverId});\n`;
  };

  // Get MCP tools block
  Blockly.Blocks['mcp_get_tools'] = {
    init: function() {
      this.setColour(290);
      this.setTooltip('Get available MCP tools');

      this.appendDummyInput()
        .appendField('Get MCP tools');

      this.setOutput(true, 'Array');
    }
  };

  javascriptGenerator.forBlock['mcp_get_tools'] = function(block, generator) {
    return ['await getMCPTools()', javascriptGenerator.ORDER_AWAIT];
  };
}
