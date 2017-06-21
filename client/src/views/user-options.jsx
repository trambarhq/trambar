var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserSection = require('widgets/user-section');

module.exports = React.createClass({
    displayName: 'UserOptions',
    propTypes: {
        user: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <UserSection>
                <header>
                    <div className="button disabled">
                        <i className="fa fa-caret-square-o-right"/>
                        <span className="label">Options</span>
                    </div>
                </header>
                <body>
                    <ul>
                        <li>Option 1</li>
                        <li>Option 2</li>
                        <li>Option 3</li>
                    </ul>
                </body>
            </UserSection>
        );
    },
});
