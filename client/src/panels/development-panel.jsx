import _ from 'lodash';
import React, { PureComponent } from 'react';
import CodePush from 'transport/code-push';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import PushButton from 'widgets/push-button';
import OptionButton from 'widgets/option-button';

import './development-panel.scss';

/**
 * Panel for toggling developer settings.
 *
 * @extends PureComponent
 */
class DevelopmentPanel extends PureComponent {
    static displayName = 'DevelopmentPanel';

    constructor(props) {
        super(props);
        this.state = {
            selectedDeploymentName: null
        };
    }

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty(path, value) {
        let { currentUser, onChange } = this.props;
        if (!currentUser) {
            return;
        }
        let userAfter = _.decoupleSet(currentUser, path, value);
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    }

    /**
     * Load deployment selection if platform is Cordova
     */
    componentWillMount() {
        let { env } = this.props;
        if (env.platform === 'cordova') {
            let codePush = CodePush.instance;
            if (codePush) {
                codePush.loadDeploymentName().then((selectedDeploymentName) => {
                    this.setState({ selectedDeploymentName });
                });
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { t } = env.locale;
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
                    {this.renderDevelopmentOptions()}
                    {this.renderDeploymentOptions()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsPanel>
        );
    }

    /**
     * Render codepush deployment options
     *
     * @return {Array<ReactElement>|null}
     */
    renderDeploymentOptions() {
        let { env } = this.props;
        if (env.platform !== 'cordova') {
            return null;
        }
        let codePush = CodePush.instance;
        let names;
        if (codePush) {
            names = codePush.getDeploymentNames();
        }
        return _.map(names, this.renderDeploymentOption);
    }

    /**
     * Render diagnostic options
     *
     * @return {Array<ReactElement>}
     */
    renderDevelopmentOptions() {
        let names = [ 'show-panel' ];
        return _.map(names, (name, index) => {
            return this.renderDevelopmentOption(name, index);
        });
    }

    /**
     * Render diagnostics option button
     *
     * @param  {String} name
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderDevelopmentOption(name, index) {
        let { env, currentUser } = this.props;
        let { t } = env.locale;
        let optionName = _.snakeCase(name);
        let settings = _.get(currentUser, 'settings', {});
        let enabled = !!_.get(settings, `development.${optionName}`);
        let buttonProps = {
            label: t(`development-${name}`),
            selected: enabled,
            onClick: this.handleDevelopmentOptionClick,
            id: optionName,
        };
        return <OptionButton key={index} {...buttonProps} />
    }

    /**
     * Render diagnostics option button
     *
     * @param  {String} name
     * @param  {Number} index
     *
     * @return {ReactElement|null}
     */
    renderDeploymentOption(name, index) {
        let { env } = this.props;
        let { selectedDeploymentName } = this.state;
        let { t } = env.locale;
        if (env.platform !== 'cordova') {
            return null;
        }
        let buttonProps = {
            label: t(`development-code-push-$deployment`, name),
            selected: (name === selectedDeploymentName),
            onClick: this.handleDeploymentOptionClick,
            id: name,
        };
        return <OptionButton key={index} {...buttonProps} />
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { t } = env.locale;
        let showProps = {
            label: t('development-show-diagnostics'),
            onClick: this.handleShowClick,
        };
        return (
            <div className="buttons">
                <PushButton {...showProps} />
            </div>
        );
    }

    /**
      * Called when a development option is clicked
      *
      * @param  {Event} evt
      */
    handleDevelopmentOptionClick = (evt) => {
        let { currentUser } = this.props;
        let optionName = evt.currentTarget.id;
        let optionPath = `development.${optionName}`;
        let settings = _.clone(_.get(currentUser, 'settings', {}));
        let enabled = !!_.get(settings, optionPath);
        if (enabled) {
            _.unset(settings, optionPath);
        } else {
            _.set(settings, optionPath, true);
         }
        this.setUserProperty('settings', settings);
    }

    /**
     * Called when a deployment option is clicked
     *
     * @param  {Event} evt
     */
    handleDeploymentOptionClick = (evt) => {
        let { env } = this.props;
        if (env.platform !== 'cordova') {
            return;
        }
        let selectedDeploymentName = evt.currentTarget.id;
        this.setState({ selectedDeploymentName }, () => {
            let codePush = CodePush.instance;
            codePush.saveDeploymentName(selectedDeploymentName);
        });
    }

    /**
     * Called when user presses show button
     *
     * @param  {Event} evt
     */
    handleShowClick = (evt) => {
        let { route } = this.props;
        route.push('diagnostics-page');
    }
}

export {
    DevelopmentPanel as default,
    DevelopmentPanel,
};

import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DevelopmentPanel.propTypes = {
        currentUser: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    };
}
