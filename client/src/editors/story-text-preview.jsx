var React = require('react'), PropTypes = React.PropTypes;
var ListParser = require('utils/list-parser');
var Markdown = require('utils/markdown');
var PlainText = require('utils/plain-text');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');

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
        onResourceClick: PropTypes.func,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <StorySection className="contents text-preview">
                <header>
                    {this.renderButtons()}
                </header>
                <body>
                    {this.renderText()}
                </body>
            </StorySection>
        );
    },

    /**
     * Render buttons in title bar
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var story = this.props.story;
        var markdownProps = {
            label: t('story-markdown'),
            icon: 'pencil-square',
            highlighted: story.details.markdown,
            onClick: this.handleMarkdownClick,
        };
        var taskListProps = {
            label: t('story-task-list'),
            icon: 'list-ol',
            highlighted: (story.type === 'task-list'),
            onClick: this.handleTaskListClick,
        };
        var surveyProps = {
            label: t('story-survey'),
            icon: 'list-ul',
            highlighted: (story.type === 'survey'),
            onClick: this.handleSurveyClick,
        };
        return (
            <div>
                <HeaderButton {...markdownProps} />
                <HeaderButton {...taskListProps} />
                <HeaderButton {...surveyProps} />
                {this.props.cornerPopUp}
            </div>
        );
    },

    /**
     * Render the text as it would appear
     *
     * @return {ReactElement}
     */
    renderText: function() {
        this.resourcesReferenced = {};
        switch (this.props.story.type) {
            case undefined:
            case '':
            case 'story':
                return this.renderRegularPost();
            case 'task-list':
                return this.renderTaskListText();
            case 'survey':
                return this.renderSurveyText();
        }
    },

    /**
     * Render text for regular post
     *
     * @return {ReactElement}
     */
    renderRegularPost: function() {
        var p = this.props.locale.pick;
        var story = this.props.story;
        var text = p(story.details.text);
        if (story.details.markdown) {
            var contents = Markdown.parse(text, this.handleReference);
            return (
                <div className="text story markdown" onClick={this.handleMarkdownClick}>
                    {contents}
                </div>
            );
        } else {
            return <div className="text story plain-text"><p>{text}</p></div>;
        }
    },

    /**
     * Render task list
     *
     * @return {ReactElement}
     */
    renderTaskListText: function() {
        var p = this.props.locale.pick;
        var story = this.props.story;
        var text = p(story.details.text);
        if (story.details.markdown) {
            // answers are written to the text itself, so there's no need to
            // provide user answers to Markdown.parseTaskList()
            var list = Markdown.parseTaskList(text, null, this.handleItemChange, this.handleReference);
            return (
                <div className="text task-list markdown" onClick={this.handleMarkdownClick}>
                    {list}
                </div>
            );
        } else {
            var list = PlainText.parseTaskList(text, null, this.handleItemChange);
            return <div className="text task-list plain-text"><p>{list}</p></div>;
        }
    },

    /**
     * Render survey choices or results depending whether user has voted
     *
     * @return {ReactElement}
     */
    renderSurveyText: function() {
        var p = this.props.locale.pick;
        var story = this.props.story;
        var text = p(story.details.text);
        if (story.details.markdown) {
            var resources = story.details.resources;
            var theme = this.props.theme;
            var survey = Markdown.parseSurvey(text, null, this.handleItemChange, this.handleReference);
            return (
                <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                    {survey}
                </div>
            );
        } else {
            var survey = PlainText.parseSurvey(text, null, this.handleItemChange);
            return <div className="text survey plain-text"><p>{survey}</p></div>;
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

    /**
     * Attach a list template to the story if there's no list yet
     *
     * @param  {Story} story
     */
    attachListTemplate: function(story) {
        if (story.type === 'task-list' || story.type === 'survey') {
            var text = story.details.text || {};
            if (!ListParser.detect(text)) {
                var t = this.props.locale.translate;
                var lang = this.props.locale.lang;
                var langText = text[lang] || '';
                if (_.trimEnd(langText)) {
                    langText = _.trimEnd(langText) + '\n\n';
                }
                var items = _.map(_.range(1, 4), (number) => {
                    var label = t(`${story.type}-item-$number`, number);
                    return `[ ] ${label}`;
                });
                langText += items.join('\n');
                story.details = _.decoupleSet(story.details, [ 'text', lang ], langText);
            }
        }
    },

    /**
     * Called when user click the Markdown button
     *
     * @param  {Event} evt
     */
    handleMarkdownClick: function(evt) {
        var story = _.decouple(this.props.story, 'details');
        story.details.markdown = !story.details.markdown;
        this.triggerChangeEvent(story, 'story.details.markdown');
    },

    /**
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference: function(evt) {
        var resources = this.props.story.details.resources;
        var res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            var theme = this.props.theme;
            var url;
            if (evt.forImage)  {
                // images are style at height = 1.5em
                url = theme.getImageUrl(res, { height: 24 });
                if (!url) {
                    // use blob if it's attached
                    var file = theme.getImageFile(res);
                    url = Markdown.createBlobUrl(file, res.clip);
                }
            } else {
                url = theme.getUrl(res);
            }
            // remember the resource and the url
            this.resourcesReferenced[url] = res;
            return {
                href: url,
                title: undefined
            };
        }
    },

    /**
     * Called when user click the task list button
     *
     * @param  {Event} evt
     */
    handleTaskListClick: function(evt) {
        var story = _.clone(this.props.story);
        story.type = (story.type !== 'task-list') ? 'task-list' : 'story';
        this.attachListTemplate(story);
        this.triggerChangeEvent(story, 'story.details.markdown');
    },

    /**
     * Called when user click the survey button
     *
     * @param  {Event} evt
     */
    handleSurveyClick: function(evt) {
        var story = _.clone(this.props.story);
        story.type = (story.type !== 'survey') ? 'survey' : 'story';
        this.attachListTemplate(story);
        this.triggerChangeEvent(story, 'story.type');
    },

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
     handleMarkdownClick: function(evt) {
        var target = evt.target;
        if (target.tagName === 'IMG') {
            var src = target.getAttribute('src');
            var res = this.resourcesReferenced[src];
            if (res) {
                if (this.props.onResourceClick) {
                    this.props.onResourceClick({
                        type: 'resourceclick',
                        target: this,
                        resource: res,
                    });
                }
            }
        }
    },

    /**
     * Called when user click a checkbox or radio button in the preview
     *
     * @param  {Event} evt
     */
    handleItemChange: function(evt) {
        // update the text of the story to reflect the selection
        var target = evt.currentTarget;
        var list = target.name;
        var item = target.value;
        var selected = target.checked;
        var story = _.decouple(this.props.story, 'details');
        var clearOthers = (story.type === 'survey');
        story.details.text = _.mapValues(story.details.text, (langText) => {
            return ListParser.update(langText, list, item, selected, clearOthers);
        });
        this.triggerChangeEvent(story, 'story.details.text');
    },
});
