var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var UploadQueue = require('transport/upload-queue');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Merger = require('data/merger');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryTextEditor = require('widgets/story-text-editor');
var StoryMediaEditor = require('widgets/story-media-editor');
var StoryOptions = require('widgets/story-options');

require('./story-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object,
        authors: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        queue: PropTypes.instanceOf(UploadQueue).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        var story = this.props.story || {};
        var authors = findUsers(this.props.authors, story.user_ids);
        var languageCode = this.props.locale.languageCode;
        var text = _.get(story, 'details.text');
        if (!_.isEmpty(text)) {
            // use the first language of the text object, but only if it's
            // different from the selected locale so that the country code
            // is kept when it's the same
            var firstLanguage = _.first(_.keys(text));
            if (languageCode.substr(0, 2) !== firstLanguage) {
                languageCode = firstLanguage;
            }
        }
        return { story, authors, languageCode };
    },

    componentWillReceiveProps: function(nextProps) {
        var nextState = {};
        if (this.props.story !== nextProps.story) {
            // perform three-way merge
            var current = this.state.story;
            var remoteBefore = this.props.story;
            var remoteAfter = nextProps.story;
            if (current !== remoteBefore) {
                nextState.story = Merger.mergeObjects(current, remoteAfter, remoteBefore);
            } else {
                nextState.story = remoteAfter;
            }
        }
        if (this.props.authors !== nextProps.authors) {
            var story = nextState.story || this.state.story;
            // update the list, include ones that have just been added
            nextState.authors = findUsers(_.concat(nextProps.authors, this.state.authors), story.user_ids);
        }
        if (!_.isEmpty(nextState)) {
            this.setState(nextState);
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (this.props.theme.mode === 'columns-1') {
            return (
                <div className="story-view columns-1">
                    {this.renderTextEditor()}
                    {this.renderSupplementalEditors()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-2') {
            return (
                <div className="story-view columns-2">
                    <div className="column-1">
                        {this.renderTextEditor()}
                    </div>
                    <div className="column-2">
                        {this.renderSupplementalEditors()}
                    </div>
                </div>
            );
        } else if (this.props.theme.mode === 'columns-3') {
            return (
                <div className="story-view columns-3">
                    <div className="column-1">
                        {this.renderTextEditor()}
                    </div>
                    <div className="column-2">
                        {this.renderSupplementalEditors()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                </div>
            );
        }
    },

    renderTextEditor: function() {
        var props = {
            story: this.state.story,
            authors: this.state.authors,
            languageCode: this.state.languageCode,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onStoryChange: this.handleStoryChange,
            onAuthorsChange: this.handleAuthorsChange,
            onPost: this.handleStoryPost,
            onCancel: this.handleStoryCancel,
        };
        return <StoryTextEditor {...props} />;
    },

    renderSupplementalEditors: function() {
        return this.renderMediaEditor();
    },

    renderMediaEditor: function() {
        var props = {
            story: this.state.story,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onStoryChange: this.handleStoryChange,
        };
        return <StoryMediaEditor {...props} />
    },

    renderOptions: function() {
        var props = {
            story: this.props.story,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryOptions {...props} />;
    },

    saveStory: function(story) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.saveOne({ table: 'story' }, story);
    },

    removeStory: function(story) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.removeOne({ table: 'story' }, story);
    },

    handleStoryChange: function(evt) {
        var story = evt.story;
        var remote = this.props.story;
        if (_.isEqual(story, remote)) {
            story = remote;
        }
        this.setState({ story });
    },

    handleAuthorsChange: function(evt) {
        // assume the order match how they should be listed in the story
        var authors = evt.authors;
        var story = _.clone(this.state.story)
        story.user_ids = _.map(authors);
        this.setState({ story, authors });
    },

    handleStoryPost: function(evt) {
        var story = this.state.story;
        story = _.clone(story);
        story.published = true;
        this.saveStory(story);
    },

    handleStoryCancel: function(evt) {
        var story = this.state.story;
        if (story.ptime) {
            // the story was published previously--republish it
            story = _.clone(story);
            story.published = true;
            this.saveStory(story);
        } else {
            this.removeStory(story);
        }
    },
});

function findUsers(users, userIds) {
    return _.filter(_.map(userIds, (id) => {
        return _.find(users, { id });
    }));
}
