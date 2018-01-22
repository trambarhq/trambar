var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var HeaderButton = require('widgets/header-button');

require('./text-toolbar.scss');

module.exports = React.createClass({
    displayName: 'TextToolbar',
    propTypes: {
        story: PropTypes.object.isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onAction: PropTypes.func,
    },

    render: function() {
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
            <div className="text-toolbar">
                <HeaderButton {...markdownProps} />
                <HeaderButton {...taskListProps} />
                <HeaderButton {...surveyProps} />
            </div>
        );
    },

    /**
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent: function(action, props) {
        if (this.props.onAction) {
            this.props.onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    },

    /**
     * Called when user clicks markdown button
     *
     * @param  {Event} evt
     */
    handleMarkdownClick: function(evt) {
        var story = this.props.story;
        var value = !story.details.markdown;
        this.triggerActionEvent('markdown-set', { value });
    },

    /**
     * Called when user clicks task-list button
     *
     * @param  {Event} evt
     */
    handleTaskListClick: function(evt) {
        var story = this.props.story;
        var value = (story.type !== 'task-list') ? 'task-list' : 'post';
        this.triggerActionEvent('story-type-set', { value });
    },

    /**
     * Called when user clicks survey button
     *
     * @param  {Event} evt
     */
    handleSurveyClick: function(evt) {
        var story = this.props.story;
        var value = (story.type !== 'survey') ? 'survey' : 'post';
        this.triggerActionEvent('story-type-set', { value });
    },
})
