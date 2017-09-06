var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var CollapsibleContainer = require('widgets/collapsible-container');

require('./membership-request-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'MembershipRequestDialogBox',
    propTypes: {
        show: PropTypes.bool,
        currentUser: PropTypes.object.isRequired,
        project: PropTypes.object.isRequired,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onConfirm: PropTypes.func,
        onClose: PropTypes.func,
        onProceed: PropTypes.func,
    },

    /**
     * Return true if current user has become a member of this project
     *
     * @return {Boolean}
     */
    isMember: function() {
        var project = this.props.project;
        var user = this.props.currentUser;
        return _.includes(project.user_ids, user.id);
    },

    /**
     * Return true if current user has requested this project
     *
     * @return {Boolean}
     */
    isApplicant: function() {
        var project = this.props.project;
        var user = this.props.currentUser;
        return _.includes(user.requested_project_ids, project.id);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCloseClick,
        };
        var classNames = [ 'membership-request-dialog-box' ];
        return (
            <Overlay {...overlayProps}>
                <div className={classNames.join(' ')}>
                    {this.renderText()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render description of project
     *
     * @return {ReactElement}
     */
    renderText: function() {
        var p = this.props.locale.pick;
        var project = this.props.project;
        var title = p(project.details.title) || project.name;
        var description = p(project.details.description);
        var projectImage = _.find(project.details.resources, { type: 'image' });
        var image;
        if (projectImage) {
            var imageUrl = this.props.theme.getImageUrl(projectImage, { width: 128 });
            image = <img src={imageUrl} />;
        }
        return (
            <div className="scrollable">
                <div className="title">{title}</div>
                {this.renderMessage()}
                <div className="description">
                    {image}
                    {description}
                </div>
            </div>
        );
    },

    /**
     * Render message about member status
     *
     * @return {ReactElement|null}
     */
    renderMessage: function() {
        var t = this.props.locale.translate;
        var contents;
        if (this.isMember()) {
            contents = (
                <div className="message accepted">
                    <i className="fa fa-user-circle-o" />
                    {' '}
                    {t('membership-request-you-are-now-member')}
                </div>
            );
        } else if (this.isApplicant()) {
            contents = (
                <div className="message requested">
                    <i className="fa fa-clock-o" />
                    {' '}
                    {t('membership-request-you-have-requested-membership')}
                </div>
            );
        };
        return <CollapsibleContainer open={!!contents}>{contents}</CollapsibleContainer>;
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.isMember()) {
            var proceedButtonProps = {
                label: t('membership-request-proceed'),
                onClick: this.handleProceedClick,
            };
            return (
                <div className="buttons">
                    <PushButton {...proceedButtonProps} />
                </div>
            );
        } else if (this.isApplicant()) {
            var doneButtonProps = {
                label: t('membership-request-ok'),
                onClick: this.handleCloseClick,
            };
            return (
                <div className="buttons">
                    <PushButton {...doneButtonProps} />
                </div>
            );
        } else {
            var cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            var confirmButtonProps = {
                label: t('membership-request-join'),
                onClick: this.handleConfirmClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...confirmButtonProps} />
                </div>
            );
        }
    },

    /**
     * Called when user click confirm button
     *
     * @param  {Event} evt
     */
    handleConfirmClick: function(evt) {
        if (this.props.onConfirm) {
            this.props.onConfirm({ type: 'confirm', target: this });
        }
    },

    /**
     * Called when user click cancel or ok button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCloseClick: function(evt) {
        if (this.props.onClose) {
            this.props.onClose({ type: 'cancel', target: this });
        }
    },
});
