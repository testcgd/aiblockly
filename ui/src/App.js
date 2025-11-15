import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import 'blockly/javascript';
import './App.css';
import mcpApi from './mcpApi';
import {
  generateMCPToolboxCategory,
  createMCPConnectionBlocks
} from './mcpBlocks';

function App() {
  const blocklyDiv = useRef(null);
  const [workspace, setWorkspace] = useState(null);
  const [mcpServers, setMcpServers] = useState([]);
  const [mcpTools, setMcpTools] = useState([]);
  const [showMcpPanel, setShowMcpPanel] = useState(false);
  const [newServer, setNewServer] = useState({
    serverId: '',
    name: '',
    command: '',
    args: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Build toolbox with MCP tools
  const buildToolbox = () => {
    const baseContents = [
      {
        kind: 'category',
        name: 'Logic',
        colour: 210,
        contents: [
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
          { kind: 'block', type: 'logic_negate' },
          { kind: 'block', type: 'logic_boolean' },
          { kind: 'block', type: 'logic_null' },
          { kind: 'block', type: 'logic_ternary' },
        ]
      },
      {
        kind: 'category',
        name: 'Loops',
        colour: 120,
        contents: [
          { kind: 'block', type: 'controls_repeat_ext' },
          { kind: 'block', type: 'controls_whileUntil' },
          { kind: 'block', type: 'controls_for' },
          { kind: 'block', type: 'controls_forEach' },
          { kind: 'block', type: 'controls_flow_statements' },
        ]
      },
      {
        kind: 'category',
        name: 'Math',
        colour: 230,
        contents: [
          { kind: 'block', type: 'math_number' },
          { kind: 'block', type: 'math_arithmetic' },
          { kind: 'block', type: 'math_single' },
          { kind: 'block', type: 'math_trig' },
          { kind: 'block', type: 'math_constant' },
          { kind: 'block', type: 'math_round' },
          { kind: 'block', type: 'math_modulo' },
        ]
      },
      {
        kind: 'category',
        name: 'Text',
        colour: 160,
        contents: [
          { kind: 'block', type: 'text' },
          { kind: 'block', type: 'text_join' },
          { kind: 'block', type: 'text_append' },
          { kind: 'block', type: 'text_length' },
          { kind: 'block', type: 'text_isEmpty' },
        ]
      },
      {
        kind: 'category',
        name: 'Variables',
        colour: 330,
        custom: 'VARIABLE'
      },
      {
        kind: 'category',
        name: 'Functions',
        colour: 290,
        custom: 'PROCEDURE'
      },
    ];

    // Add MCP tools category if tools are available
    if (mcpTools.length > 0) {
      const mcpCategory = generateMCPToolboxCategory(mcpTools);
      if (mcpCategory) {
        baseContents.push(mcpCategory);
      }
    }

    return {
      kind: 'categoryToolbox',
      contents: baseContents
    };
  };

  // Load MCP servers on mount
  useEffect(() => {
    loadMcpServers();
    createMCPConnectionBlocks(); // Create helper blocks
  }, []);

  const loadMcpServers = async () => {
    try {
      const result = await mcpApi.getServers();
      if (result.success) {
        setMcpServers(result.servers || []);
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  };

  const handleAddServer = async () => {
    try {
      setLoading(true);
      setMessage('');

      const args = newServer.args ? newServer.args.split(' ') : [];

      await mcpApi.addServer({
        serverId: newServer.serverId,
        name: newServer.name,
        command: newServer.command,
        args: args
      });

      setMessage('Server added successfully!');
      setNewServer({ serverId: '', name: '', command: '', args: '' });
      await loadMcpServers();
    } catch (error) {
      setMessage('Failed to add server: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectServer = async (serverId) => {
    try {
      setLoading(true);
      setMessage('');

      const result = await mcpApi.connectToServer(serverId);
      if (result.success) {
        setMessage(`Connected to ${serverId}!`);
        await loadMcpTools();
        await loadMcpServers();
      }
    } catch (error) {
      setMessage('Failed to connect: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectServer = async (serverId) => {
    try {
      setLoading(true);
      setMessage('');

      const result = await mcpApi.disconnectFromServer(serverId);
      if (result.success) {
        setMessage(`Disconnected from ${serverId}!`);
        await loadMcpTools();
        await loadMcpServers();
      }
    } catch (error) {
      setMessage('Failed to disconnect: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMcpTools = async () => {
    try {
      const result = await mcpApi.getAllTools();
      if (result.success) {
        setMcpTools(result.tools || []);
      }
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    }
  };

  // Update toolbox when MCP tools change
  useEffect(() => {
    if (workspace) {
      const newToolbox = buildToolbox();
      workspace.updateToolbox(newToolbox);
    }
  }, [mcpTools, workspace]);

  useEffect(() => {
    if (blocklyDiv.current && !workspace) {
      const initialToolbox = buildToolbox();
      const newWorkspace = Blockly.inject(blocklyDiv.current, {
        toolbox: initialToolbox,
        grid: {
          spacing: 20,
          length: 3,
          colour: '#ccc',
          snap: true
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
          pinch: true
        },
        trashcan: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true
        },
        theme: {
          'blockStyles': {
            "logic_blocks": { "colourPrimary": "#5b80a5" },
            "loop_blocks": { "colourPrimary": "#5ba55b" },
            "math_blocks": { "colourPrimary": "#5b67a5" },
            "text_blocks": { "colourPrimary": "#5ba58c" },
            "variable_blocks": { "colourPrimary": "#a55b80" },
            "procedure_blocks": { "colourPrimary": "#995ba5" },
          },
        }
      });

      setWorkspace(newWorkspace);

      // Add workspace change listener
      newWorkspace.addChangeListener(() => {
        const code = Blockly.JavaScript.workspaceToCode(newWorkspace);
        console.log('Generated code:', code);
      });

      // Handle window resize
      const onResize = () => {
        Blockly.svgResize(newWorkspace);
      };
      window.addEventListener('resize', onResize);
      
      return () => {
        window.removeEventListener('resize', onResize);
        newWorkspace.dispose();
      };
    }
  }, [workspace]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AIBlockly Editor with MCP</h1>
        <button
          className="mcp-toggle-btn"
          onClick={() => setShowMcpPanel(!showMcpPanel)}
        >
          {showMcpPanel ? 'Hide' : 'Show'} MCP Panel
        </button>
      </header>

      {showMcpPanel && (
        <div className="mcp-panel">
          <h2>MCP Servers</h2>

          {message && (
            <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="mcp-servers-list">
            <h3>Connected Servers</h3>
            {mcpServers.length === 0 ? (
              <p>No servers configured</p>
            ) : (
              mcpServers.map(server => (
                <div key={server.id} className="server-item">
                  <div className="server-info">
                    <strong>{server.name || server.id}</strong>
                    <span className={`status ${server.isConnected ? 'connected' : 'disconnected'}`}>
                      {server.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </span>
                    {server.isConnected && (
                      <span className="tool-count">{server.toolCount} tools</span>
                    )}
                  </div>
                  <div className="server-actions">
                    {server.isConnected ? (
                      <button onClick={() => handleDisconnectServer(server.id)} disabled={loading}>
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={() => handleConnectServer(server.id)} disabled={loading}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mcp-add-server">
            <h3>Add New Server</h3>
            <input
              type="text"
              placeholder="Server ID"
              value={newServer.serverId}
              onChange={(e) => setNewServer({...newServer, serverId: e.target.value})}
            />
            <input
              type="text"
              placeholder="Server Name"
              value={newServer.name}
              onChange={(e) => setNewServer({...newServer, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="Command (e.g., node, python)"
              value={newServer.command}
              onChange={(e) => setNewServer({...newServer, command: e.target.value})}
            />
            <input
              type="text"
              placeholder="Arguments (space separated)"
              value={newServer.args}
              onChange={(e) => setNewServer({...newServer, args: e.target.value})}
            />
            <button onClick={handleAddServer} disabled={loading || !newServer.serverId || !newServer.command}>
              Add Server
            </button>
          </div>

          <div className="mcp-tools-list">
            <h3>Available MCP Tools ({mcpTools.length})</h3>
            {mcpTools.length === 0 ? (
              <p>No tools available. Connect to a server first.</p>
            ) : (
              <ul>
                {mcpTools.map((tool, idx) => (
                  <li key={idx}>
                    <strong>{tool.name}</strong> ({tool.serverName})
                    {tool.description && <p>{tool.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="blockly-workspace-container">
        <div
          ref={blocklyDiv}
          style={{
            height: '100%',
            width: '100%',
            position: 'absolute'
          }}
        />
      </div>
    </div>
  );
}

export default App; 