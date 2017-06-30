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
var StoryTextEditor = require('editors/story-text-editor');
var StoryMediaEditor = require('editors/story-media-editor');
var StoryEditorOptions = require('editors/story-editor-options');
var CornerPopUp = require('widgets/corner-pop-up');

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

        onChange: PropTypes.func,
        onCommit: PropTypes.func,
        onCancel: PropTypes.func,
    },

    getInitialState: function() {
        var nextState = {
            languageCode: '',
            options: {},
        };
        this.updateLanguage(nextState, this.props);
        return nextState;
    },

    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story || this.props.locale !== nextProps.locale) {
            this.updateLanguage(nextState, nextProps);
        }
        var changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    updateLanguage: function(nextState, nextProps) {
        var story = nextProps.story;
        var locale = nextProps.locale;
        var languageCode = locale.languageCode;
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
        nextState.languageCode = languageCode;
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
            story: this.props.story,
            authors: this.props.authors,
            languageCode: this.state.languageCode,
            cornerPopUp: this.renderPopUpMenu('main'),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.props.onChange,
            onCommit: this.props.onCommit,
            onCancel: this.props.onCancel,
        };
        return <StoryTextEditor {...props} />;
    },

    renderSupplementalEditors: function() {
        return this.renderMediaEditor();
    },

    renderMediaEditor: function() {
        var props = {
            story: this.props.story,
            cornerPopUp: this.renderPopUpMenu('supplemental'),

            database: this.props.database,
            queue: this.props.queue,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.props.onChange,
        };
        return <StoryMediaEditor {...props} />
    },

    renderPopUpMenu: function(section) {
        if (this.props.theme.mode === 'columns-3') {
            return null;
        }
        return (
            <CornerPopUp>
                {this.renderOptions(true, section)}
            </CornerPopUp>
        );
    },

    renderOptions: function(inMenu, section) {
        var props = {
            inMenu,
            section,
            story: this.props.story,
            options: this.state.options,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleOptionsChange,
        };
        return <StoryEditorOptions {...props} />;
    },

    handleOptionsChange: function(evt) {
        var options = evt.options;
        this.setState({ options });
    },
});

function findUsers(users, userIds) {
    return _.filter(_.map(userIds, (id) => {
        return _.find(users, { id });
    }));
}
