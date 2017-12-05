var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./start-page.scss');

module.exports = Relaks.createClass({
    displayName: 'StartPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/'
            ], (params) => {
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/`, query, hash;
            return { path, query, hash };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var db = this.props.database.use({ by: this });
        var props = {
            locale: this.props.locale,
        };
        return db.start().then((currentUserId) => {
            var criteria = {
                deleted: false
            };
            return db.findOne({ schema: 'global', table: 'system', criteria });
        }).then((system) => {
            if (system) {
                this.props.route.replace(require('pages/project-list-page'));
                return null;
            }
            setTimeout(() => {
                this.props.route.replace(require('pages/settings-page'), { edit: true });
            }, 2500);
            return <StartPageSync {...props} />;
        });
    },
});

var StartPageSync = module.exports.Sync = React.createClass({
    displayName: 'StartPage.Sync',
    propType: {
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className={`start-page ${this.props.stage}`}>
                <h2>{t('welcome')}</h2>
            </div>
        );
    }
});
