var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Merger = require('data/merger');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryTextEditor = require('editors/story-text-editor');
var StoryMediaEditor = require('editors/story-media-editor');
var StoryTextPreview = require('editors/story-text-preview');
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
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onCommit: PropTypes.func,
        onCancel: PropTypes.func,
    },

    getInitialState: function() {
        var nextState = {
            options: defaultOptions,
        };
        this.updateOptions(nextState, this.props);
        return nextState;
    },

    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story || this.props.locale !== nextProps.locale) {
            this.updateOptions(nextState, nextProps);
        }
        var changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    updateOptions: function(nextState, nextProps) {
        var story = nextProps.story;
        var locale = nextProps.locale;
        var options = nextState.options;

        if (!story.id) {
            // reset options to default when a new story starts
            options = defaultOptions;
        }
        options = nextState.options = _.clone(options);

        if (!options.languageCode) {
            // set language code
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
            options.languageCode = languageCode;
        }

        if (!options.supplementalEditor) {
            // show preview when text is formatted
            if (story.type === 'vote' || story.type === 'task-list') {
                options.supplementalEditor = 'preview';
            }
            if (_.get(story, 'details.markdown', false)) {
                options.supplementalEditor = 'preview';
            }
        } else {
            if (!story.id) {
                // clear selection when a new story starts
                options.supplementalEditor = '';
            }
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
                    {this.renderSupplementalEditor()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-2') {
            return (
                <div className="story-view columns-2">
                    <div className="column-1">
                        {this.renderTextEditor()}
                    </div>
                    <div className="column-2">
                        {this.renderSupplementalEditor()}
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
                        {this.renderSupplementalEditor()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                </div>
            );
        }
    },

    /**
     * Render editor for entering text
     *
     * @return {ReactElement}
     */
    renderTextEditor: function() {
        var props = {
            story: this.props.story,
            authors: this.props.authors,
            languageCode: this.state.options.languageCode,
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

    /**
     * Render one of the supplemental editors
     *
     * @return {ReactElement}
     */
    renderSupplementalEditor: function() {
        if (this.state.options.supplementalEditor === 'preview') {
            return this.renderTextPreview();
        } else {
            return this.renderMediaEditor();
        }
    },

    /**
     * Render MarkDown preview
     *
     * @return {ReactElement}
     */
    renderTextPreview: function() {
        var props = {
            story: this.props.story,
            cornerPopUp: this.renderPopUpMenu('supplemental'),
            languageCode: this.state.options.languageCode,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.props.onChange,
        };
        return <StoryTextPreview {...props} />
    },

    /**
     * Render editor for adding images and videos
     *
     * @return {ReactElement}
     */
    renderMediaEditor: function() {
        var props = {
            story: this.props.story,
            cornerPopUp: this.renderPopUpMenu('supplemental'),

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.props.onChange,
        };
        return <StoryMediaEditor {...props} />
    },

    /**
     * Render popup menu
     *
     * @return {ReactElement}
     */
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

    /**
     * Render editor options
     *
     * @return {ReactElement}
     */
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

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange: function(evt) {
        var options = evt.options;
        this.setState({ options });
    },
});

var defaultOptions = {
    languageCode: '',
    addIssue: false,
    hidePost: false,
    bookmarkRecipients: [],
    supplementalEditor: '',
};
