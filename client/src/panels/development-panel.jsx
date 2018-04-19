var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
if (process.env.PLATFORM === 'cordova') {
    var CodePush = require('code-push');
}

var Route = require('routing/route');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var PushButton = require('widgets/push-button');
var OptionButton = require('widgets/option-button');

require('./development-panel.scss');

module.exports = React.createClass({
    displayName: 'DevelopmentPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selectedDeploymentName: null
        };
    },

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty: function(path, value) {
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
    },

    /**
     * Load deployment selection if platform is Cordova
     */
    componentWillMount: function() {
        if (process.env.PLATFORM === 'cordova') {
            CodePush.loadDeploymentName().then((selectedDeploymentName) => {
                this.setState({ selectedDeploymentName });
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
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
    },

    /**
     * Render codepush deployment options
     *
     * @return {Array<ReactElement>|null}
     */
    renderDeploymentOptions: function() {
        if (process.env.PLATFORM !== 'cordova') return null;
        return _.map(names, this.renderDeploymentOption);
    },

    /**
     * Render diagnostic options
     *
     * @return {Array<ReactElement>}
     */
    renderDevelopmentOptions: function() {
        var names = [ 'show-panel' ];
        return _.map(names, this.renderDevelopmentOption);
    },

    /**
     * Render diagnostics option button
     *
     * @param  {String} name
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderDevelopmentOption: function(name, index) {
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
    },

    /**
     * Render diagnostics option button
     *
     * @param  {String} name
     * @param  {Number} index
     *
     * @return {ReactElement|null}
     */
    renderDeploymentOption: function(name, index) {
        if (process.env.PLATFORM !== 'cordova') return null;
        var t = this.props.locale.translate;
        var buttonProps = {
            label: t(`development-code-push-$deployment`, name),
            selected: (name === this.state.selectedDeploymentName),
            onClick: this.handleDeploymentOptionClick,
            id: name,
        };
        return <OptionButton key={index} {...buttonProps} />
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
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
    },

    /**
      * Called when a development option is clicked
      *
      * @param  {Event} evt
      */
    handleDevelopmentOptionClick: function(evt) {
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
    },

    /**
     * Called when a deployment option is clicked
     *
     * @param  {Event} evt
     */
    handleDeploymentOptionClick: function(evt) {
        if (process.env.PLATFORM !== 'cordova') return null;
        var selectedDeploymentName = evt.currentTarget.id;
        this.setState({ selectedDeploymentName }, () => {
            CodePush.saveDeploymentName(selectedDeploymentName);
        });
    },

    /**
     * Called when user presses show button
     *
     * @param  {Event} evt
     */
    handleShowClick: function(evt) {
        var route = this.props.route;
        var params = {
            schema: route.parameters.schema,
            diagnostics: true,
        };
        route.push(require('pages/settings-page'), params);
    },
});
