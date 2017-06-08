var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var ChangeDetector = require('utils/change-detector');

// widgets
var StorySection = require('widgets/story-section');
var Time = require('widgets/time');

require('./story-text-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryTextEditor',
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        if (ChangeDetector.detectShallowChanges(this.props, nextProps, [ 'locale', 'theme', 'story' ])) {
            return true;
        }
        if (ChangeDetector.detectArrayChanges(this.props, nextProps, [ 'authors' ])) {
            return true;
        }
        return false;
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderProfileImage()}
                    {this.renderNames()}
                </header>
                <subheader>
                    {this.renderCoauthoringButtons()}
                </subheader>
                <body>
                    {this.renderTextArea()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </StorySection>
        );
    },

    renderProfileImage: function() {
        var profileImage = _.get(this.props.authors, '0.details.profile_image');
        var url;
        if (profileImage) {
            url = `http://localhost${profileImage.url}`;
        }
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    renderNames: function() {
        var names = _.map(this.props.authors, 'details.name');
        return (
            <span className="name">
                {_.join(names)}
                &nbsp;
            </span>
        )
    },

    renderCoauthoringButtons: function() {
        return (
            <div>
                <span className="button">
                    <i className="fa fa-plus-square" />
                    <span className="label">
                        Co-write post with a colleague
                    </span>
                </span>
            </div>
        )
    },

    renderTextArea: function() {
        var p = this.props.locale.pick;
        var text = _.get(this.props.story, 'details.text');
        return <textarea value={p(text)} />;
    },

    renderButtons: function() {
        return (
            <div className="buttons">
                <button className="cancel">
                    Cancel
                </button>
                <button className="post">
                    Post
                </button>
            </div>
        );
    }
});
