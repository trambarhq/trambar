var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var PhotoCaptureDialog = require('widgets/photo-capture-dialog');

require('./story-media-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryMediaEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            capturingPhoto: false,
        };
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderButtons()}
                    {this.renderPhotoDialog()}
                </header>
                <body>
                    {this.renderPreview()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        return (
            <div>
                <div className="button" onClick={this.handlePhotoClick}>
                    <i className="fa fa-camera"/>
                    <span className="label">{t('story-photo')}</span>
                </div>
                <div className="button">
                    <i className="fa fa-video-camera"/>
                    <span className="label">{t('story-video')}</span>
                </div>
            </div>
        );
    },

    /**
     * Render dialogbox for capturing picture through MediaStream API
     *
     * @return {ReactElement|null}
     */
    renderPhotoDialog: function() {
        if (process.env.PLATFORM === 'browser') {
            var props = {
                show: this.state.capturingPhoto,
                onAdd: this.handlePhotoAdd,
                onCancel: this.handlePhotoCancel,
            };
            return <PhotoCaptureDialog {...props} />
        } else {
            return null;
        }
    },

    renderPreview: function() {

    },

    /**
     * Call onStoryChange handler
     *
     * @param  {Story} story
     */
    triggerStoryChangeEvent: function(story) {
        if (this.props.onStoryChange) {
            this.props.onStoryChange({
                type: 'storychange',
                target: this,
                story,
            })
        }
    },

    /**
     * Called when user click on photo button
     *
     * @param  {Event} evt
     */
    handlePhotoClick: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: true });
        }
    },

    /**
     * Called when user clicks x or outside the photo dialog
     *
     * @param  {Event} evt
     */
    handlePhotoCancel: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: false });
        }
    },

    /**
     * Called after a user has taken a photo
     *
     * @param  {Object} evt
     */
    handlePhotoAdd: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            var image = evt.image;
            var story = _.clone(this.props.story);
            var images = _.slice(story.details.images);
            images.push(image);
            this.triggerStoryChangeEvent(story);
        }
    },
});
