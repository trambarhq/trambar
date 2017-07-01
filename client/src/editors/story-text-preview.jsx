var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var MarkDown = require('widgets/mark-down');

require('./story-text-preview.scss');

module.exports = React.createClass({
    displayName: 'StoryTextPreview',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        languageCode: PropTypes.string.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
        };
    },

    render: function() {
        return (
            <StorySection className="text-preview">
                <header>
                    {this.renderButtons()}
                    {this.props.cornerPopUp}
                </header>
                <body>
                    {this.renderText()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var markdownProps = {
            label: t('story-markdown'),
            icon: 'pencil-square',
        };
        var taskListProps = {
            label: t('story-tasks'),
            icon: 'list',
        };
        var voteProps = {
            label: t('story-vote'),
            icon: 'check-square-o',
        };
        return (
            <div>
                <HeaderButton {...markdownProps} />
                <HeaderButton {...taskListProps} />
                <HeaderButton {...voteProps} />
            </div>
        );
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

    /**
     * Call onStoryChange handler
     *
     * @param  {Story} story
     * @param  {String} path
     */
    triggerChangeEvent: function(story, path) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                story,
                path,
            })
        }
    },

});
