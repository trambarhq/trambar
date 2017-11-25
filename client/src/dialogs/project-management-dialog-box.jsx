var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Route = require('routing/route');
var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var Scrollable = require('widgets/scrollable');
var OptionButton = require('widgets/option-button');

require('./project-management-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ProjectManagementDialogBox',
    propTypes: {
        show: PropTypes.bool,
        projectLinks: PropTypes.arrayOf(PropTypes.object).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onDelete: PropTypes.func,
        onCancel: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selection: [],
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="project-management-dialog-box">
                    {this.renderList()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render list of users
     *
     * @return {Array<ReactElement>}
     */
    renderList: function() {
        return (
            <Scrollable>
                {_.map(this.props.projectLinks, this.renderProjectButton)}
            </Scrollable>
        );
    },

    /**
     * Render button for project
     *
     * @param  {Object} link
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderProjectButton: function(link, index) {
        var p = this.props.locale.pick;
        var params = this.props.route.parameters;
        var current = (link.address === params.address && link.schema === params.schema);
        var props = {
            id: link.key,
            label: p(link.name),
            iconOn: (current) ? 'check-circle' : 'times-circle',
            selected: _.includes(this.state.selection, link.key) || current,
            disabled: current,
            onClick: this.handleProjectClick,
        };
        return <OptionButton key={index} {...props} />;
    },

    /**
     * Render cancel and OK buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var cancelProps = {
            label: t('project-management-cancel'),
            onClick: this.handleCancelClick,
        };
        var removeProps = {
            label: t('project-management-remove'),
            onClick: this.handleRemoveClick,
            emphasized: true,
            disabled: _.isEmpty(this.state.selection),
        };
        return (
            <div className="buttons">
                <PushButton {...cancelProps} />
                <PushButton {...removeProps} />
            </div>
        );
    },

    /**
     * Called when user clicks
     *
     * @param  {[type]} evt
     *
     * @return {[type]}
     */
    handleProjectClick: function(evt) {
        var key = evt.currentTarget.id;
        var selection = _.slice(this.state.selection);
        if (_.includes(selection, key)) {
            _.pull(selection, key);
        } else {
            selection.push(key);
        }
        this.setState({ selection });
    },

    /**
     * Called when user click remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        if (this.props.onDelete) {
            this.props.onDelete({
                type: 'delete',
                target: this,
                selection: this.state.selection,
            })
        }
    },

    /**
     * Called when user click cancel button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },
});
