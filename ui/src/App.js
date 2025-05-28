import React, { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import 'blockly/javascript';
import './App.css';

function App() {
  const blocklyDiv = useRef(null);
  const toolbox = {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: 'Logic',
        colour: 210,
        contents: [
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
        ]
      },
      {
        kind: 'category',
        name: 'Loops',
        colour: 120,
        contents: [
          { kind: 'block', type: 'controls_repeat_ext' },
          { kind: 'block', type: 'controls_whileUntil' },
        ]
      },
      {
        kind: 'category',
        name: 'Math',
        colour: 230,
        contents: [
          { kind: 'block', type: 'math_number' },
          { kind: 'block', type: 'math_arithmetic' },
        ]
      }
    ]
  };

  useEffect(() => {
    if (blocklyDiv.current) {
      const workspace = Blockly.inject(blocklyDiv.current, {
        toolbox: toolbox,
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
          scaleSpeed: 1.2
        },
        trashcan: true
      });

      // Add workspace change listener
      workspace.addChangeListener(() => {
        const code = Blockly.JavaScript.workspaceToCode(workspace);
        console.log('Generated code:', code);
      });
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AIBlockly Editor</h1>
      </header>
      <div 
        ref={blocklyDiv} 
        style={{ 
          height: '80vh', 
          width: '100%',
          position: 'absolute',
          bottom: 0
        }}
      />
    </div>
  );
}

export default App; 