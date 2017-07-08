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
var StoryText = require('widgets/story-text');

require('./story-text-preview.scss');

module.exports = React.createClass({
    displayName: 'StoryTextPreview',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        options: PropTypes.object.isRequired,
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
                </header>
                <body>
                    {this.renderText()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var storyType = _.get(this.props.story, 'type');
        var markdown = _.get(this.props.story, 'details.markdown', false);
        var markdownProps = {
            label: t('story-markdown'),
            icon: 'pencil-square',
            highlighted: markdown,
            onClick: this.handleMarkdownClick,
        };
        var taskListProps = {
            label: t('story-task-list'),
            icon: 'list-ol',
            highlighted: (storyType === 'task-list'),
            onClick: this.handleTaskListClick,
        };
        var voteProps = {
            label: t('story-vote'),
            icon: 'list-ul',
            highlighted: (storyType === 'vote'),
            onClick: this.handleVoteClick,
        };
        return (
            <div>
                <HeaderButton {...markdownProps} />
                <HeaderButton {...taskListProps} />
                <HeaderButton {...voteProps} />
                {this.props.cornerPopUp}
            </div>
        );
    },

    renderText: function() {
        var textProps = {
            story: this.props.story,
            locale: this.props.locale,
            theme: this.props.theme,
            options: this.props.options,
            onItemChange: this.handleItemChange,
        };
        return <StoryText {...textProps}/>
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

    /**
     * Attach a list template to the story if there's no list yet
     *
     * @param  {Story} story
     */
    attachListTemplate: function(story) {
        if (story.type === 'task-list' || story.type === 'vote') {
            if (!StoryText.hasLists(story)) {
                StoryText.addListTemplate(story, this.props.languageCode, this.props.locale);
            }
        }
    },

    handleMarkdownClick: function(evt) {
        var story = _.decouple(this.props.story, 'details');
        story.details.markdown = !story.details.markdown;
        this.triggerChangeEvent(story, 'story.details.markdown');
    },

    handleTaskListClick: function(evt) {
        var story = _.clone(this.props.story);
        story.type = (story.type !== 'task-list') ? 'task-list' : 'story';
        this.attachListTemplate(story);
        this.triggerChangeEvent(story, 'story.details.markdown');
    },

    handleVoteClick: function(evt) {
        var story = _.clone(this.props.story);
        story.type = (story.type !== 'vote') ? 'vote' : 'story';
        this.attachListTemplate(story);
        this.triggerChangeEvent(story, 'story.type');
    },

    handleItemChange: function(evt) {
        var input = evt.target;
        var story = _.clone(this.props.story);
        StoryText.updateList(story, this.props.languageCode, input);
        this.triggerChangeEvent(story, 'story.details.text');
    },
});
