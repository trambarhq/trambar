var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./project-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ProjectPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/projects/:projectId/', url);
        },

        getUrl: function(params) {
            return `/projects/${params.projectId}/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            projects: null,
            currentUser: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ProjectPageSync {...props} />);
        return db.start().then((userId) => {
            return <ProjectPageSync {...props} />;
        });
    }
});

var ProjectPageSync = module.exports.Sync = React.createClass({
    displayName: 'ProjectPage.Sync',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div>
                <h2>Project page</h2>
            </div>
        );
    }
});
