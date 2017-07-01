var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');

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
                    {this.renderMarkDownText()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        return <span>Preview</span>
    },

    renderMarkDownText: function() {
        return <div>Text</div>;
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
