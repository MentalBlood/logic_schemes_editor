'use strict';

const default_elements = {
  'INPUT': {
    'inputs': [],
    'outputs': ['x']
  },
  'OUTPUT': {
    'inputs': ['x'],
    'outputs': []
  },
  'NOT': {
    'inputs': ['x'],
    'outputs': ['!x']
  },
  'AND': {
    'inputs': ['x', 'y'],
    'outputs': ['x && y']
  },
  'OR': {
    'inputs': ['x', 'y'],
    'outputs': ['x || y']
  }
};
const custom_elements = {};

function getTypeInfo(type_name) {
  if (type_name in default_elements) return default_elements[type_name];else if (type_name in custom_elements) return custom_elements[type_name];
}

function getUniqueId(some_dict) {
  return Object.keys(some_dict).length == 0 ? 0 : String(Math.max(...Object.keys(some_dict)) + 1);
}

function filledArray(l, n) {
  return Array.from({
    length: l
  }, (_, i) => n);
}

class BlocksArea extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      'name': 'test',
      'new_element_type': 'new',
      'new_element_inputs_number': 1,
      'new_element_outputs_number': 1,
      'blocks': {},
      'wires': {},
      'adding_block': false,
      'adding_wire': false,
      'adding_wire_info': undefined,
      'scale': 1
    };
    this.onBlockStateChange = this.onBlockStateChange.bind(this);
    this.onBlockMounted = this.onBlockMounted.bind(this);
    this.onBlockStopInitialDragging = this.onBlockStopInitialDragging.bind(this);
    this.save = this.save.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.startAddingWire = this.startAddingWire.bind(this);
    this.handleMouseUpOnInputOutput = this.handleMouseUpOnInputOutput.bind(this);
    this.handleSchemeNameInputChange = this.handleSchemeNameInputChange.bind(this);
    this.handleNewElementNameInputChange = this.handleNewElementNameInputChange.bind(this);
    this.handleNewElementInputsNumberInputChange = this.handleNewElementInputsNumberInputChange.bind(this);
    this.handleNewElementOutputsNumberInputChange = this.handleNewElementOutputsNumberInputChange.bind(this);
    this.handleAddBlockButtonClick = this.handleAddBlockButtonClick.bind(this);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.remove_wires = this.remove_wires.bind(this);
    this._ref = React.createRef();
  }

  componentDidMount() {
    this.state.event_listeners = [[this._ref.current, 'contextmenu', e => e.preventDefault()], [this._ref.current, 'mousemove', this.handleMouseMove], [this._ref.current, 'mouseup', this.handleMouseUp], //fucking drag and drop
    [this._ref.current, 'drag', e => e.preventDefault()], [this._ref.current, 'dragstart', e => e.preventDefault()], [this._ref.current, 'dragend', e => e.preventDefault()], [this._ref.current, 'dragover', e => e.preventDefault()], [this._ref.current, 'dragenter', e => e.preventDefault()], [this._ref.current, 'dragleave', e => e.preventDefault()], [this._ref.current, 'drop', e => e.preventDefault()]];

    for (const e_l of this.state.event_listeners) e_l[0].addEventListener(e_l[1], e_l[2]);
  }

  componentWillUnmount() {
    for (const e_l of this.state.event_listeners) e_l[0].removeEventListener(e_l[1], e_l[2]);
  }

  add(data) {
    this.setState(state => {
      if (!('blocks' in data)) return state;

      for (const b of data.blocks) {
        const dict_with_blocks_with_such_name = Object.fromEntries(Object.entries(this.state.blocks).filter(([k, v]) => v.type == b.type));
        const id = Object.keys(dict_with_blocks_with_such_name).length + 1;
        const id_string = b.type + '_' + String(id);
        if (state.blocks[id_string] != undefined) return state;
        const block = {
          'type': b.type,
          'x': b.x,
          'y': b.y,
          'inputs': b.inputs,
          'outputs': b.outputs
        };
        if (b.dragging) block['dragging'] = true;
        console.log('add block', block);
        state.blocks[id_string] = block;
      }

      return state;
    }, () => {
      if (!('wires' in data)) return;
      this.render();
      this.setState(state => {
        for (const w of data.wires) {
          const new_id = getUniqueId(state.wires);
          state.wires[new_id] = {
            'id': new_id,
            'from_block_id': String(w.from_block_id),
            'to_block_id': String(w.to_block_id),
            'from_output_id': w.from_output_id,
            'to_input_id': w.to_input_id
          };
          this.updateWireCoordinates(state, new_id);
        }

        return state;
      });
    });
  }

  updateWireCoordinates(state, wire_id) {
    const wire = state.wires[wire_id];
    const from_block = state.blocks[wire.from_block_id];
    const to_block = state.blocks[wire.to_block_id];
    wire.from_point = from_block.output_connectors_coordinates[wire.from_output_id];
    wire.to_point = to_block.input_connectors_coordinates[wire.to_input_id];
    state.wires[wire_id] = wire;
  }

  onBlockMounted(detail) {
    this.setState(state => {
      for (const key in detail) state.blocks[detail.id][key] = detail[key];

      return state;
    });
  }

  onBlockStateChange(detail) {
    this.setState(state => {
      for (const key in detail) state.blocks[detail.id][key] = detail[key];

      Object.values(state.wires).forEach(w => {
        if (detail.id == w.from_block_id || detail.id == w.to_block_id) this.updateWireCoordinates(state, w.id);
      });
      return state;
    });
  }

  onBlockStopInitialDragging(block_id) {
    this.setState(state => {
      state.blocks[block_id].dragging = false;
      return state;
    });
  }

  getSaveData() {
    const blocks = this.state.blocks;
    return {
      [this.state.name]: {
        'wires': Object.values(this.state.wires).map(w => ({
          'from': w.from_block_id + '[' + (w.from_output_id + 1) + ']',
          'to': w.to_block_id + '[' + (w.to_input_id + 1) + ']'
        }))
      }
    };
  }

  getSaveName() {
    // const today = new Date();
    // const current_date = today.getFullYear().toString()
    // 	+ '-' + (today.getMonth() + 1).toString()
    // 	+ '-' + today.getDate().toString();
    // const current_time = today.getHours()
    // 	+ ":" + today.getMinutes()
    // 	+ ":" + today.getSeconds();
    // return 'logic-scheme'
    // 	+ '-' + this.state.name
    // 	+ '-' + current_date
    // 	+ '-' + current_time
    // 	+ '.json';
    return this.state.name + '.json';
  }

  save() {
    const save_data = this.getSaveData();
    const save_data_text = JSON.stringify(save_data, null, '\t');
    const save_name = this.getSaveName();
    downloadFile(save_name, save_data_text);
  }

  handleMouseDown(e, element_type, inputs_number, outputs_number) {
    if (e.button != 0) return;
    this.add({
      'blocks': [{
        'type': element_type,
        'x': e.clientX,
        'y': e.clientY,
        'dragging': true,
        'inputs': inputs_number ? filledArray(inputs_number, '') : undefined,
        'outputs': inputs_number ? filledArray(outputs_number, '') : undefined
      }]
    });
  }

  handleMouseMove(e) {
    if (this.state.adding_wire_info) {
      const info = this.state.adding_wire_info;
      if (info.from_block_id == undefined) this.setState(state => {
        state.adding_wire_info.from_point = {
          'x': e.clientX,
          'y': e.clientY
        };
        return state;
      });else this.setState(state => {
        state.adding_wire_info.to_point = {
          'x': e.clientX,
          'y': e.clientY
        };
        return state;
      });
    }
  }

  handleMouseUp() {
    this.setState({
      'adding_wire': false
    });
  }

  handleMouseUpOnInputOutput(input_output_info) {
    const new_wire_info = Object.assign({}, this.state.adding_wire_info);
    this.setState({
      'adding_wire_info': undefined
    });

    for (const key in input_output_info) new_wire_info[key] = input_output_info[key];

    if (!('to_block_id' in new_wire_info) || !('from_block_id' in new_wire_info)) return;
    delete new_wire_info['from_point'];
    delete new_wire_info['to_point'];
    this.add({
      'wires': [new_wire_info]
    });
  }

  deleteBlock(id) {
    this.setState(state => {
      delete state.blocks[id];
      state.wires = Object.fromEntries(Object.entries(state.wires).filter(([k, v]) => v.from_block_id != id && v.to_block_id != id));
      return state;
    });
  }

  startAddingWire(wire_info) {
    this.setState({
      'adding_wire': true,
      'adding_wire_info': wire_info
    });
  }

  remove_wires(mask) {
    this.setState(state => {
      state.wires = Object.fromEntries(Object.entries(state.wires).filter(([k, v]) => {
        for (const mask_key in mask) if (mask[mask_key] != v[mask_key]) return true;

        return false;
      }));
      return state;
    });
  }

  handleSchemeNameInputChange(e) {
    this.setState({
      'name': e.target.value
    });
  }

  handleNewElementNameInputChange(e) {
    this.setState({
      'new_element_type': e.target.value
    });
  }

  handleNewElementInputsNumberInputChange(e) {
    this.setState({
      'new_element_inputs_number': e.target.value
    });
  }

  handleNewElementOutputsNumberInputChange(e) {
    this.setState({
      'new_element_outputs_number': e.target.value
    });
  }

  handleMouseWheel(e) {
    const delta = e.deltaY;
    this.setState(state => {
      state.scale += delta / 1000;
      return state;
    });
  }

  handleAddBlockButtonClick() {
    const name = this.state.new_element_type;
    const inputs_number = this.state.new_element_inputs_number;
    const outputs_number = this.state.new_element_outputs_number;
    const new_element_info = {
      'inputs': filledArray(inputs_number, ''),
      'outputs': filledArray(outputs_number, '')
    };
    custom_elements[name] = new_element_info;
    this.forceUpdate();
  }

  render() {
    const scale = this.state.scale;
    return /*#__PURE__*/React.createElement("div", {
      className: "blocksArea",
      ref: this._ref
    }, /*#__PURE__*/React.createElement("div", {
      className: "sidePanel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "controls"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "schemeName unselectable",
      value: this.state.name,
      onChange: this.handleSchemeNameInputChange
    }), /*#__PURE__*/React.createElement("button", {
      className: "saveButton animated unselectable",
      onClick: this.save
    }, "save")), /*#__PURE__*/React.createElement("div", {
      className: "blocks"
    }, /*#__PURE__*/React.createElement("div", {
      className: "block blockToAdd",
      onMouseDown: e => this.handleMouseDown(e, this.state.new_element_type, this.state.new_element_inputs_number, this.state.new_element_outputs_number)
    }, /*#__PURE__*/React.createElement("div", {
      className: "content"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "name",
      value: this.state.new_element_type,
      onChange: this.handleNewElementNameInputChange,
      onMouseDown: e => {
        e.stopPropagation();
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "inputsOutputsNumber"
    }, /*#__PURE__*/React.createElement("div", {
      className: "inputsNumber"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      value: this.state.new_element_inputs_number,
      onChange: this.handleNewElementInputsNumberInputChange
    })), /*#__PURE__*/React.createElement("div", {
      className: "outputsNumber"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      value: this.state.new_element_outputs_number,
      onChange: this.handleNewElementOutputsNumberInputChange
    }))), /*#__PURE__*/React.createElement("button", {
      className: "addBlockButton animated",
      onClick: this.handleAddBlockButtonClick
    }, "+"), Object.entries(custom_elements).map((element_type_and_element, i) => /*#__PURE__*/React.createElement("div", {
      key: element_type_and_element[0],
      className: "block",
      onMouseDown: e => this.handleMouseDown(e, element_type_and_element[0])
    }, /*#__PURE__*/React.createElement("div", {
      className: "content"
    }, /*#__PURE__*/React.createElement("div", {
      className: "name unselectable"
    }, element_type_and_element[0])))), Object.entries(default_elements).map((element_type_and_element, i) => /*#__PURE__*/React.createElement("div", {
      key: element_type_and_element[0],
      className: "block",
      onMouseDown: e => this.handleMouseDown(e, element_type_and_element[0])
    }, /*#__PURE__*/React.createElement("div", {
      className: "content"
    }, /*#__PURE__*/React.createElement("div", {
      className: "name unselectable"
    }, element_type_and_element[0])))))), /*#__PURE__*/React.createElement("div", {
      className: "schemeArea",
      onWheel: this.handleMouseWheel
    }, Object.entries(this.state.blocks).map(block_id_and_block => /*#__PURE__*/React.createElement(Block, {
      key: block_id_and_block[0] + '_' + scale,
      id: block_id_and_block[0],
      type: block_id_and_block[1].type,
      x: block_id_and_block[1].x,
      y: block_id_and_block[1].y,
      scale: scale,
      dragging: block_id_and_block[1].dragging,
      inputs: block_id_and_block[1].inputs,
      outputs: block_id_and_block[1].outputs,
      function_to_delete_self: () => this.deleteBlock(block_id_and_block[0]),
      start_adding_wire_function: this.startAddingWire,
      handle_mouse_up_on_input_output_function: this.handleMouseUpOnInputOutput,
      remove_wires_function: this.remove_wires,
      onMount: this.onBlockMounted,
      onStateChange: this.onBlockStateChange,
      onStopInitialDragging: this.onBlockStopInitialDragging
    })), Object.values(this.state.wires).filter(w => w.from_point).map(wire => /*#__PURE__*/React.createElement(Wire, {
      key: wire.id,
      from_point: wire.from_point,
      to_point: wire.to_point,
      scale: scale
    })), this.state.adding_wire ? /*#__PURE__*/React.createElement(Wire, {
      key: -1,
      from_point: this.state.adding_wire_info.from_point,
      to_point: this.state.adding_wire_info.to_point,
      scale: scale
    }) : null));
  }

}