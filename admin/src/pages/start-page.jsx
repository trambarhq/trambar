var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var SystemFinder = require('objects/finders/system-finder');

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

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ by: this });
        var props = {
            locale: this.props.locale,
        };
        return db.start().then((currentUserId) => {
            return SystemFinder.findSystem(db).then((system) => {
                if (_.isEmpty(system)) {
                    if (!this.redirectTimeout) {
                        this.redirectTimeout = setTimeout(() => {
                            this.props.route.replace('settings-page', { edit: true });
                        }, 2500);
                    }
                } else {
                    return this.props.route.replace('project-list-page');
                }
            });
        }).then((system) => {
            return <StartPageSync {...props} />;
        }).catch((err) => {
            return null;
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
