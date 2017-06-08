var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var ChangeDetector = require('utils/change-detector');

// widgets
var StoryTextEditor = require('widgets/story-text-editor');
var StoryMediaEditor = require('widgets/story-media-editor');
var StoryOptions = require('widgets/story-options');

require('./story-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryEditor',
    propTypes: {
        story: PropTypes.object,
        authors: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            story: _.cloneDeep(this.props.story) || {},
            authors: _.slice(this.props.authors),
        };
    },

    componentWillReceiveProps: function(nextProps) {
        var state = {};
        if (this.props.story !== nextProps.story) {
            // TODO: perform three-way merge
            state.story = _.cloneDeep(nextProps.story) || {};
        }
        if (this.props.authors !== nextProps.authors) {
            state.authors = _.slice(this.props.authors);
        }
        if (!_.isEmpty(state)) {
            this.setState(state);
        }
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        if (ChangeDetector.detectShallowChanges(this.state, nextState, [ 'story' ])) {
            return true;
        }
        if (ChangeDetector.detectArrayChanges(this.state, nextState, [ 'authors' ])) {
            return true;
        }
        if (ChangeDetector.detectShallowChanges(this.props, nextProps, [ 'locale', 'theme' ])) {
            return true;
        }
        return false;
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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onCoauthorAdd: this.handleCoauthorAdd,
            onCoauthorClear: this.handleCoauthorClear,
            onTextChange: this.handleTextChange,
        };
        return <StoryTextEditor {...props} />;
    },

    renderSupplementalEditors: function() {
        var props = {
            story: this.state.story,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
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
});
