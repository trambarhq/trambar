var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Masonry = require('react-masonry-component');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectPanel = require('panels/project-panel');
var UserPanel = require('panels/user-panel');
var NotificationPanel = require('panels/notification-panel');
var LanguagePanel = require('panels/language-panel');

require('./settings-page.scss');

module.exports = React.createClass({
    displayName: 'SettingsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(path, query, url) {
            return Route.match(path, [
                '/global/settings/?',
                '/:schema/settings/?',
            ], (params) => {
                return params;
            });
        },

        getUrl: function(params) {
            var path = `/${params.schema || 'global'}/settings/`, query, hash;
            return { path, query, hash };
        },

        getOptions: function(route) {
            return {
                navigation: {
                    top: {},
                    bottom: {
                        section: 'settings',
                    }
                },
            };
        },
    },

    render: function() {
        var props = this.props;
        var masonryOptions = {
            transitionDuration: 0
        };
        return (
            <div className="settings-page">
                <Masonry options={masonryOptions}>
                    <ProjectPanel {...props} />
                    <UserPanel {...props} />
                    <NotificationPanel {...props} />
                    <LanguagePanel {...props} />
                </Masonry>
            </div>
        );
    },
});
