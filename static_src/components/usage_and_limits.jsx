
import style from 'cloudgov-style/css/cloudgov-style.css';
import React from 'react';

import Action from './action.jsx';
import { FormNumber } from './form.jsx';
import PanelGroup from './panel_group.jsx';
import PanelBlock from './panel_block.jsx';
import PanelRow from './panel_row.jsx';
import ResourceUsage from './resource_usage.jsx';

import appActions from '../actions/app_actions.js';
import createStyler from '../util/create_styler';

function getStat(statName, props) {
  if (statName.indexOf('quota') > -1) {
    return (props.app.stats &&
            props.app.stats[statName] ||
            0);
  }

  return (props.app.stats &&
          props.app.stats.usage[statName] ||
          0);
}

function megabytes(value) {
  return Math.floor(value / 1024 / 1024);
}

function stateSetter(props) {
  return {
    editing: !!props.editing,
    partialApp: {
      // Properties are mapped directly to API https://apidocs.cloudfoundry.org/246/apps/updating_an_app.html
      disk_quota: props.app.disk_quota,
      instances: props.app.instances,
      memory: props.app.memory
    }
  };
}

export default class UsageAndLimits extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.styler = createStyler(style);
    this.state = stateSetter(props);

    this.getStat = this.getStat.bind(this);
    this._onSubmit = this._onSubmit.bind(this);
    this._onToggleEdit = this._onToggleEdit.bind(this);
  }

  getStat(statName) {
    return getStat(statName, this.props);
  }

  _onToggleEdit() {
    this.setState(stateSetter(Object.assign({}, this.props, { editing: !this.state.editing })));
  }

  _onChange(property, value) {
    let parsedValue = value;
    // TODO use form validation to parse values
    switch (property) {
      case 'disk_quota':
      case 'memory':
        parsedValue = megabytes(value);
        break;
      default:
        parsedValue = parseInt(value, 10);
        break;
    }

    const partialApp = Object.assign(
      {},
      this.state.partialApp,
      { [property]: parsedValue }
    );
    this.setState({ partialApp });
  }


  get disk() {
    const onChange = this._onChange.bind(this, 'disk_quota');

    return (
    <div className={ this.styler('panel-row-space') }>
      <div className={ this.styler('panel-column') }>
        <ResourceUsage title="Instance disk"
          amountUsed={ this.getStat('disk') }
          amountTotal={ this.getStat('disk_quota') }
        />
      </div>
      <div className={ this.styler('panel-column') } style={{ textAlign: 'left' }}>
        <ResourceUsage title="Instance disk"
          editable={ this.state.editing }
          max={ 2 * 1024 }
          onChange={ onChange }
          name="disk"
          amountTotal={ this.state.partialApp.disk_quota * 1024 * 1024 }
        />
      </div>
    </div>
    );
  }

  get memory() {
    const onChange = this._onChange.bind(this, 'memory');

    return (
    <div>
      <div className={ this.styler('panel-column') }>
        <ResourceUsage title="Instance memory"
          amountUsed={ this.getStat('mem') }
          amountTotal={ this.getStat('mem_quota') }
        />
      </div>
      <div className={ this.styler('panel-column') } style={{ textAlign: 'left' }}>
        <ResourceUsage title="Instance memory"
          editable={ this.state.editing }
          max={ this.props.quota.memory_limit / this.state.partialApp.instances * 1024 }
          name="memory"
          onChange={ onChange }
          amountTotal={ this.state.partialApp.memory * 1024 * 1024 }
        />
      </div>
    </div>
    );
  }

  get totalDisk() {
    // TODO get space quota
    return (
    <div className={ this.styler('panel-row-space') }>
      <ResourceUsage title="Total disk"
        amountUsed={ this.getStat('disk') * this.props.app.running_instances }
        amountTotal={ this.getStat('disk_quota') }
      />
    </div>
    );
  }

  get totalMemory() {
    return (
    <div>
      <ResourceUsage title="Total memory"
        amountUsed={ this.getStat('mem') * this.props.app.running_instances }
        amountTotal={ this.props.quota.memory_limit * 1024 * 1024 }
      />
    </div>
    );
  }

  get scale() {
    const onChange = (e) => {
      this._onChange('instances', e.target.value);
    };

    let instances = (
      <span className={ this.styler('stat-primary')}>
	{ this.state.partialApp.instances }X
      </span>
    );

    if (this.state.editing) {
      instances = (
        <FormNumber
          className={ this.styler('stat-input', 'stat-input-text', 'stat-input-text-scale') }
          id="scale"
          name="scale"
          onValidate={ onChange }
          value={ this.state.partialApp.instances }
        />
      );
    }

    return (
      <div className={ this.styler('stat-single_box') }>
        <h5>App scale</h5>
	{ instances }
        <br />
        <h5 className={ this.styler('stat-info') }>
          Scale applies to memory and disk
        </h5>
      </div>
    );
  }

  _onSubmit() {
    appActions.updateApp(this.props.app.guid, this.state.partialApp);
    this.setState({ editing: false });
  }

  render() {
    let content = <div></div>;
    let controls = (
      <Action
        style="primary"
        type="outline"
        label="Modify allocation and scale"
        clickHandler={ this._onToggleEdit }
      >
          <span>Modify allocation and scale</span>
        </Action>
    );

    if (this.state.editing) {
      controls = (
        <div>
          <Action style="finish" type="button" label="OK" clickHandler={ this._onSubmit }>
            <span>OK</span>
          </Action>
          <Action type="outline" label="Cancel" clickHandler={ this._onToggleEdit }>
            <span>Cancel</span>
          </Action>
        </div>
      );
    }

    if (this.props.app) {
      content = (
      <div>
        <PanelGroup>
          <PanelGroup columns={ 6 }>
            <PanelRow>
              { this.memory }
            </PanelRow>
            <PanelRow>
              { this.disk }
            </PanelRow>
          </PanelGroup>
          <PanelGroup columns={ 3 }>
            <PanelBlock>
              { this.scale }
            </PanelBlock>
          </PanelGroup>
          <PanelGroup columns={ 3 }>
            <PanelRow>
              { this.totalMemory }
            </PanelRow>
            <PanelRow>
              { this.totalDisk }
            </PanelRow>
          </PanelGroup>
        </PanelGroup>
        <PanelGroup>
          <PanelRow>
            <div className={ this.styler('panel-controls') }>
              { controls }
            </div>
          </PanelRow>
        </PanelGroup>
      </div>
      );
    }

    return content;
  }
}

UsageAndLimits.propTypes = {
  app: React.PropTypes.object,
  editing: React.PropTypes.bool,
  quota: React.PropTypes.object
};

UsageAndLimits.defaultProps = {
  app: {},
  editing: false,
  quota: {}
};
