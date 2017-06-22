var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var BlobReader = require('utils/blob-reader');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');

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

        onChange: PropTypes.func,
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
        var photoButtonProps = {
            label: t('story-photo'),
            icon: 'camera',
            onClick: this.handlePhotoClick,
        };
        var videoButtonProps = {
            label: t('story-video'),
            icon: 'video-camera',
            onClick: this.handleVideoClick,
        };
        var selectButtonProps = {
            label: t('story-file'),
            icon: 'file',
            onChange: this.handleFileSelect,
        }
        return (
            <div>
                <Button {...photoButtonProps} />
                <Button {...videoButtonProps} />
                <FileButton {...selectButtonProps} />
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
                locale: this.props.locale,
                onCapture: this.handlePhotoCapture,
                onCancel: this.handlePhotoCancel,
            };
            return <PhotoCaptureDialogBox {...props} />
        } else {
            return null;
        }
    },

    renderPreview: function() {

    },

    /**
     * Call onChange handler
     *
     * @param  {Story} story
     */
    triggerChangeEvent: function(story) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                story,
            })
        }
    },

    attachImage: function(image) {
        var story = _.cloneDeep(this.props.story);
        if (!story.details.images) {
            story.details.images = [];
        }
        story.details.images.push(image);
        this.triggerChangeEvent(story);
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
    handlePhotoCapture: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: false });
            this.attachImage(evt.image);
        }
    },

    handleFileSelect: function(evt) {
        var file = evt.target.files[0];
        if (file) {
            return BlobReader.loadImage(file).then((img) => {
                var type = file.type;
                var width = img.naturalWidth;
                var height = img.naturalHeight;
                var image = { type, file, width, height };
                this.attachImage(image);
            });
        }
    },
});

function Button(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [ 'button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    return (
        <div className={classNames.join(' ')} onClick={props.onClick}>
            <i className={props.icon ? `fa fa-${props.icon}` : null}/>
            <span className="label">{props.label}</span>
        </div>
    );
}

function FileButton(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [ 'button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    return (
        <label className={classNames.join(' ')}>
            <i className={props.icon ? `fa fa-${props.icon}` : null}/>
            <span className="label">{props.label}</span>
            <input type="file" value="" onChange={props.onChange} />
        </label>
    );
}
