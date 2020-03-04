import _ from 'lodash';
import React, { useState, useCallback, useEffect } from 'react';
import { useListener } from 'relaks';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './development-panel.scss';

/**
 * Panel for toggling developer settings.
 */
export function DevelopmentPanel(props) {
  const { route, env, userDraft } = props;
  const { t } = env.locale;
  const [ selectedDeploymentName, setSelectedDeploymentName ] = useState({});
  const deploymentNames = (env.codePush) ? env.codePush.getDeploymentNames() : [];
  const deploymentOptions = [ 'show-panel' ];

  const handleDevelopmentOptionClick = useListener((evt) => {
    const optionName = evt.currentTarget.id;
    userDraft.toggle(`settings.development.${optionName}`)
  });
  const handleDeploymentOptionClick = useListener((evt) => {
    const name = evt.currentTarget.id;
    env.codePush.saveDeploymentName(name);
    setSelectedDeploymentName(name);
  });
  const handleShowClick = useListener((evt) => {
    route.push('diagnostics-page');
  }, [ route ]);

  useEffect(() => {
    if (env.codePush) {
      async function load() {
        const name = env.codePush.loadDeploymentName();
        if (name) {
          setSelectedDeploymentName(name);
        }
      }
      load();
    }
  }, [])

  return (
    <SettingsPanel className="diagnostics">
      <header>
        <div className="icon">
          <i className="fa fa-bug" />
          <i className="fa fa-search icon-overlay" />
        </div>
        {' '}
        {t('settings-development')}
      </header>
      <body>
        {_.map(deploymentNames, renderDeploymentOption)}
        {_.map(deploymentOptions, renderDevelopmentOption)}
      </body>
      <footer>
        {renderButtons()}
      </footer>
    </SettingsPanel>
  );

  function renderDevelopmentOption(name, index) {
    const optionName = _.snakeCase(name);
    const enabled = userDraft.get(`settings.development.${optionName}`, false);
    const buttonProps = {
      label: t(`development-${name}`),
      selected: enabled,
      onClick: handleDevelopmentOptionClick,
      id: optionName,
    };
    return <OptionButton key={index} {...buttonProps} />
  }

  function renderDeploymentOption(name, index) {
    const deploymentName = selectedDeploymentName || _.first(deploymentNames);
    const buttonProps = {
      label: t(`development-code-push-$deployment`, name),
      selected: (name === deploymentName),
      onClick: this.handleDeploymentOptionClick,
      id: name,
    };
    return <OptionButton key={index} {...buttonProps} />
  }

  function renderButtons() {
    const showProps = {
      label: t('development-show-diagnostics'),
      onClick: handleShowClick,
    };
    return (
      <div className="buttons">
        <PushButton {...showProps} />
      </div>
    );
  }
}
