var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var MarkDown = require('widgets/mark-down');
var Time = require('widgets/time');

require('./story-contents.scss');

module.exports = React.createClass({
    displayName: 'StoryContents',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        pending: PropTypes.bool.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <StorySection className="contents">
                <header>
                    {this.renderProfileImage()}
                    {this.renderNames()}
                    {this.props.cornerPopUp}
                </header>
                <subheader>
                    {this.renderTime()}
                </subheader>
                <body>
                    {this.renderContents()}
                </body>
            </StorySection>
        );
    },

    renderProfileImage: function() {
        var leadAuthor = _.get(this.props.authors, 0);
        var resources = _.get(leadAuthor, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, 48, 48);
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
                {_.join(names, ', ')}
                &nbsp;
            </span>
        )
    },

    renderTime: function() {
        if (this.props.pending) {
            var t = this.props.locale.translate;
            return <span className="time">{t('story-pending')}</span>;
        }
        var props = {
            time: this.props.story.ptime,
            locale: this.props.locale,
        };
        return <Time {...props} />
    },

    renderContents: function() {
        return (
            <div>
                {this.renderText()}
                {this.renderResources()}
            </div>
        )
    },

    renderText: function() {
        var p = this.props.locale.pick;
        var text = _.get(this.props.story, 'details.text');
        var markdown = _.get(this.props.story, 'details.markdown', false);
        if (markdown) {
            return <MarkDown>{p(text)}</MarkDown>
        } else {
            return <div className="plain-text">{p(text)}</div>;
        }
    },

    renderResources: function() {
        var resources = _.get(this.props.story, 'details.resources');
        if (_.isEmpty(resources)) {
            return null;
        }
    }
});
