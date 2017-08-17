var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');

require('./project-page.scss');

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
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            project: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ProjectPageSync {...props} />);
        return db.start().then((userId) => {
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
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
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(_.get(this.props.project, 'details.title'));
        return (
            <div className="project-summary-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('project-summary-edit')}
                </PushButton>
                <h2>{t('project-summary-$title', title)}</h2>
            </div>
        );
    },
});
