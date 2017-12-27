var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var Scrollable = require('widgets/scrollable');

require('./project-description-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ProjectDescriptionDialogBox',
    propTypes: {
        show: PropTypes.bool,
        project: PropTypes.object.isRequired,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onClose: PropTypes.func,
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
        return (
            <Overlay {...overlayProps}>
                <div className="project-description-dialog-box">
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
            var imageURL = this.props.theme.getImageURL(projectImage, { width: 160 });
            image = <img src={imageURL} />;
        }
        return (
            <Scrollable>
                <div className="title">{title}</div>
                <div className="description">
                    {image}
                    {description}
                </div>
            </Scrollable>
        );
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var closeButtonProps = {
            label: t('project-description-close'),
            onClick: this.handleCloseClick,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
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
