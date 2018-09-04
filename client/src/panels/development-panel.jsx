import _ from 'lodash';
import React, { PureComponent } from 'react';
import CodePush from 'transport/code-push';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import PushButton from 'widgets/push-button';
import OptionButton from 'widgets/option-button';

import './development-panel.scss';

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
        if (!this.props.currentUser) {
            return;
        }
        var userAfter = _.decoupleSet(this.props.currentUser, path, value);
        if (this.props.onChange) {
            this.props.onChange({
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
        if (process.env.PLATFORM === 'cordova') {
            var codePush = CodePush.instance;
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
        var t = this.props.locale.translate;
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
        if (process.env.PLATFORM !== 'cordova') return null;
        var codePush = CodePush.instance;
        var names;
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
        var names = [ 'show-panel' ];
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
        var t = this.props.locale.translate;
        var optionName = _.snakeCase(name);
        var settings = _.get(this.props.currentUser, 'settings', {});
        var enabled = !!_.get(settings, `development.${optionName}`);
        var buttonProps = {
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
        if (process.env.PLATFORM !== 'cordova') return null;
        var t = this.props.locale.translate;
        var buttonProps = {
            label: t(`development-code-push-$deployment`, name),
            selected: (name === this.state.selectedDeploymentName),
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
        var t = this.props.locale.translate;
        var showProps = {
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
        var optionName = evt.currentTarget.id;
        var optionPath = `development.${optionName}`;
        var settings = _.clone(_.get(this.props.currentUser, 'settings', {}));
        var enabled = !!_.get(settings, optionPath);
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
        if (process.env.PLATFORM !== 'cordova') return null;
        var selectedDeploymentName = evt.currentTarget.id;
        this.setState({ selectedDeploymentName }, () => {
            var codePush = CodePush.instance;
            codePush.saveDeploymentName(selectedDeploymentName);
        });
    }

    /**
     * Called when user presses show button
     *
     * @param  {Event} evt
     */
    handleShowClick = (evt) => {
        var route = this.props.route;
        var params = {
            schema: route.parameters.schema,
            diagnostics: true,
        };
        route.push(require('pages/settings-page'), params);
    }
}

export {
    DevelopmentPanel as default,
    DevelopmentPanel,
};

import Route from 'routing/route';
import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DevelopmentPanel.propTypes = {
        currentUser: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    };
}
