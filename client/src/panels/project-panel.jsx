var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var PushButton = require('widgets/push-button');
var ProjectDescriptionDialogBox = require('dialogs/project-description-dialog-box');
var MobileSetupDialogBox = require('dialogs/mobile-setup-dialog-box');

require('./project-panel.scss');

module.exports = React.createClass({
    displayName: 'ProjectPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
        currentProject: PropTypes.object,
        projectLinks: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getDefaultProps: function() {
        return {
            projectLinks: [
                {
                    name: {
                        en: 'Trambar',
                    },
                    schema: 'trambar',
                    address: 'http://localhost',
                },
                {
                    name: {
                        en: 'Test Project',
                    },
                    schema: 'test',
                    address: 'http://localhost',
                },
                {
                    name: {
                        en: 'Chicken love',
                    },
                    schema: 'chicken',
                    address: 'http://localhost',
                }
            ]
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            showingDialog: null
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="project">
                <header>
                    <i className="fa fa-database" /> {t('settings-projects')}
                </header>
                <body>
                    {this.renderProjects()}
                    {this.renderDialogBox()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsSection>
        );
    },

    /**
     * Render list of projects
     *
     * @return {Array<ReactElement>}
     */
    renderProjects: function() {
        return _.map(this.props.projectLinks, this.renderProject);
    },

    /**
     * Render a project option, with additional links if it's the current project
     *
     * @param  {Object} link
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderProject: function(link, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var schema = this.props.route.parameters.schema;
        if (link.schema === schema) {
            return (
                <div key={i} className="project-option-button selected">
                    <i className="icon fa fa-check-circle" />
                    <div className="text">
                        <span>{p(link.name)}</span>
                        <div className="supplemental">
                            <div className="item">
                                <span className="label">
                                    <i className="fa fa-fw fa-home" />
                                    {link.address}
                                </span>
                            </div>
                            <div className="item">
                                <span className="label" onClick={this.handleDescriptionClick}>
                                    <i className="fa fa-fw fa-info-circle" />
                                    {t('project-panel-description')}
                                </span>
                            </div>
                            <div className="item">
                                <span className="label" onClick={this.handleMobileSetupClick}>
                                    <i className="fa fa-fw fa-qrcode" />
                                    {t('project-panel-mobile-set-up')}
                                </span>
                            </div>
                            <div className="item">
                                <span className="label" onClick={this.handleSignOutClick}>
                                    <i className="fa fa-fw fa-sign-out" />
                                    {t('project-panel-sign-out')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div key={i} className="project-option-button">
                    <i className="icon fa fa-circle-o" />
                    <div className="text">
                        <span>{p(link.name)}</span>
                    </div>
                </div>
            );
        }
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var addProps = {
            label: 'Add',
        };
        var manageProps = {
            label: 'Manage list',
        };
        return (
            <div className="buttons">
                <PushButton {...manageProps} />
                <PushButton {...addProps} />
            </div>
        );
    },

    /**
     * Render opened dialog box
     *
     * @return {ReactElement}
     */
    renderDialogBox: function() {
        if (!this.props.currentProject) {
            return null;
        }
        return (
            <div>
                {this.renderDescriptionDialogBox()}
                {this.renderMobileSetupDialogBox()}
            </div>
        );
    },

    /**
     * Render project description dialog box
     *
     * @return {ReactElement}
     */
    renderDescriptionDialogBox: function() {
        var props = {
            show: (this.state.showingDialog === 'description'),
            project: this.props.currentProject,
            locale: this.props.locale,
            theme: this.props.theme,
            onClose: this.handleDialogClose,
        };
        return <ProjectDescriptionDialogBox {...props} />;
    },

    /**
     * Render mobile setup dialog box
     *
     * @return {ReactElement}
     */
    renderMobileSetupDialogBox: function() {
        var props = {
            show: (this.state.showingDialog === 'mobile-setup'),
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
        };
        return <MobileSetupDialogBox {...props} />;
    },

    /**
     * Called when user clicks description button
     *
     * @param  {Event} evt
     */
    handleDescriptionClick: function(evt) {
        this.setState({ showingDialog: 'description' });
    },

    /**
     * Called when user clicks mobile-setup button
     *
     * @param  {Event} evt
     */
    handleMobileSetupClick: function(evt) {
        this.setState({ showingDialog: 'mobile-setup' });
    },

    /**
     * Called when user clicks sign-out button
     *
     * @param  {Event} evt
     */
    handleSignOutClick: function(evt) {
        this.setState({ showingDialog: 'sign-out' });
    },

    /**
     * Called when user closes a dialog box
     *
     * @param  {Object} evt
     */
    handleDialogClose: function(evt) {
        this.setState({ showingDialog: null });
    },
});
