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

    renderPhotoDialog: function() {
        if (process.env.PLATFORM === 'browser') {
            var props = {
                show: this.state.capturingPhoto,
                onCancel: this.handlePhotoCancel,
            };
            return <PhotoCaptureDialog {...props} />
        }
    },

    handlePhotoClick: function() {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: true });
        }
    },

    handlePhotoCancel: function() {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: false });
        }
    }
});
