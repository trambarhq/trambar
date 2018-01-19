var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Route = require('routing/route');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var PushButton = require('widgets/push-button');
var OptionButton = require('widgets/option-button');

require('./diagnostics-panel.scss');

module.exports = React.createClass({
    displayName: 'DiagnosticsPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
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
                        <i className="fa fa-heartbeat" />
                        <i className="fa fa-search icon-overlay" />
                    </div>
                    {' '}
                    {t('settings-diagnostics')}
                </header>
                <body>
                    {this.renderOptions()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsPanel>
        );
    },

    /**
     * Render diagnostics options
     *
     * @return {Array<ReactElement>}
     */
    renderOptions: function() {
        var names = [ 'show-panel' ];
        return _.map(names, this.renderOption);
    },

    /**
     * Render diagnostics option button
     *
     * @param  {String} name
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderOption: function(name, index) {
        var t = this.props.locale.translate;
        var optionName = _.snakeCase(name);
        var settings = _.get(this.props.currentUser, 'settings', {});
        var enabled = !!_.get(settings, `diagnostics.${optionName}`);
        var buttonProps = {
            label: t(`diagnostics-${name}`),
            selected: enabled,
            onClick: this.handleOptionClick,
            id: optionName,
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
            label: t('diagnostics-show'),
            onClick: this.handleShowClick,
        };
        return (
            <div className="buttons">
                <PushButton {...showProps} />
            </div>
        );
    },

    /**
     * Called when an option is clicked
     */
    handleOptionClick: function(evt) {
        var optionName = evt.currentTarget.id;
        var settings = _.clone(_.get(this.props.currentUser, 'settings', {}));
        var enabled = !!_.get(settings, `diagnostics.${optionName}`);
        if (enabled) {
            _.unset(settings, `diagnostics.${optionName}`);
        } else {
            _.set(settings, `diagnostics.${optionName}`, (optionName === 'merge') ? 'master' : true);
        }
        this.setUserProperty('settings', settings);
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
