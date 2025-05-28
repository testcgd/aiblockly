import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import 'blockly/javascript';
import './App.css';

function App() {
  const blocklyDiv = useRef(null);
  const [workspace, setWorkspace] = useState(null);

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
    ]
  };

  useEffect(() => {
    if (blocklyDiv.current && !workspace) {
      const newWorkspace = Blockly.inject(blocklyDiv.current, {
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
        <h1>AIBlockly Editor</h1>
      </header>
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