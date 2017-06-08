var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var ChangeDetector = require('utils/change-detector');

// widgets
var StorySection = require('widgets/story-section');

require('./story-media-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryMediaEditor',
    propTypes: {
        story: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        if (ChangeDetector.detectShallowChanges(this.props, nextProps, [ 'locale', 'theme', 'story' ])) {
            return true;
        }
        if (ChangeDetector.detectArrayChanges(this.props, nextProps, [ 'reactions', 'respondents' ])) {
            return true;
        }
        return false;
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderButtons()}
                </header>
                <body>
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        return (
            <div>
                <div className="button">
                    <i className="fa fa-camera"/>
                    <span className="label">Photo</span>
                </div>
                <div className="button">
                    <i className="fa fa-video-camera"/>
                    <span className="label">Video</span>
                </div>
            </div>
        );
    },
});
