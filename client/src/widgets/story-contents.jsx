var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var StorySection = require('widgets/story-section');

module.exports = React.createClass({
    displayName: 'StoryContents',
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    Hello world
                </header>
                <subheader>
                    <span class="time">2017-08-01</span>
                </subheader>
                <body>
                    This is a test
                </body>
            </StorySection>
        );
    },
});
