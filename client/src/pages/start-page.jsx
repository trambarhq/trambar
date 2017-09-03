var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var HttpRequest = require('transport/http-request');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./start-page.scss');

module.exports = Relaks.createClass({
    displayName: 'StartPage',
    propTypes: {
        unauthorizedLocation: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onAuthorization: PropTypes.func,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('//:server/start/', url)
                || Route.match('/start/', url);
        },

        getUrl: function(params) {
            var server = params.server;
            var url = '/start/';
            if (server) {
                url = '//${server}' + url;
            }
            return url;
        },
    },

    getInitialState: function() {
        return {
            system: null,
            providers: null,
            authentication: null,
        };
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: this.state.system,
            providers: this.state.providers,
            projects: null,
            unauthorizedLocation: this.props.unauthorizedLocation,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onOAuthEnded: this.handleOAuthEnded,
        };
        if (this.props.unauthorizedLocation) {
            if (!this.state.system) {
                // ask server to create an authentication session, used to
                // track the status of the sign-in process
                var conn = this.props.database.access(this.props.unauthorizedLocation);
                var url = `${conn.protocol}://${conn.server}/auth/session`;
                var options = { responseType: 'json', contentType: 'json' };
                var payload = { area: 'client' };
                meanwhile.show(<StartPageSync {...props} />, 250);
                return HttpRequest.fetch('POST', url, payload, options).then((session) => {
                    if (session.system) {
                        // setState will trigger a redraw, so don't bother updating props
                        this.setState({
                            system: session.system,
                            providers: session.providers,
                            authentication: session.authentication,
                        });
                    }
                    return <StartPageSync {...props} />;
                });
            } else {
                return <StartPageSync {...props} />;
            }
        } else {
            // handle things normally after we've gained authorization
            meanwhile.show(<StartPageSync {...props} />, 250);
            return db.start().then((userId) => {
                // load system info
                var criteria = {};
                return db.findOne({ table: 'system', criteria });
            }).then((system) => {
                props.system = system;
                meanwhile.show(<StartPageSync {...props} />);
            }).then(() => {
                // load projects
                var criteria = {};
                return db.find({ table: 'project', criteria });
            }).then((projects) => {
                props.projects = projects;
                return <StartPageSync {...props} />;
            });
        }
    },

    /**
     * Inform parent component that sign-in was successful
     *
     * @param  {Object} credentials
     */
    triggerAuthorizationEvent: function(credentials) {
        if (this.props.onAuthorization) {
            this.props.onAuthorization({
                type: 'authorization',
                target: this,
                credentials,
            });
        }
    },

    /**
     * Retrieve authorization object from server
     */
    handleOAuthEnded: function() {
        var token = this.state.authentication.token;
        var conn = this.props.database.access(this.props.unauthorizedLocation);
        var url = `${conn.protocol}://${conn.server}/auth/session/${token}`;
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options).then((session) => {
            if (session.authorization) {
                var credentials = {
                    server: this.props.unauthorizedLocation.server,
                    token: session.authorization.token,
                    user_id: session.authorization.user_id,
                };
                this.triggerAuthorizationEvent(credentials);
            }
        }).catch((err) => {
            console.log(err.message);
        });
    },
});

var StartPageSync = module.exports.Sync = React.createClass({
    displayName: 'StartPage.Sync',
    propTypes: {
        system: PropTypes.object,
        providers: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
        unauthorizedLocation: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var style;
        if (this.props.system) {
            var resources = _.get(this.props.system, 'details.resources');
            var backgroundImage = _.find(resources, { type: 'image' });
            if (backgroundImage) {
                var imageUrl = this.props.theme.getImageUrl(backgroundImage, 1024);
                style = { backgroundImage: `url(${imageUrl})` };
            }
        }
        return (
            <div className="start-page" style={style}>
                <div className="bar">
                    <div className="content-area">
                        {this.renderDescription()}
                        {this.renderButtons()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render text describing the system
     *
     * @return {ReactElement|null}
     */
    renderDescription: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var system = this.props.system;
        if (!system) {
            return null;
        }
        var title = p(system.details.title) || t('start-system-title-default');
        var description = p(system.details.description);
        return (
            <div className="section description">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
        );
    },

    /**
     * Render list of buttons, either OAuth providers or available projects
     *
     * @return {ReactElement|null}
     */
    renderButtons: function() {
        if (this.props.unauthorizedLocation) {
            return this.renderOAuthButtons();
        } else {
            return this.renderProjectButtons();
        }
    },

    /**
     * Render OAuth buttons
     *
     * @return {ReactElement|null}
     */
    renderOAuthButtons: function() {
        var t = this.props.locale.translate;
        var providers = this.props.providers;
        if (!providers) {
            return null;
        }
        return (
            <div className="section buttons">
                <h2>{t('start-social-login')}</h2>
                <p>{_.map(providers, this.renderOAuthButton)}</p>
            </div>
        );
    },

    /**
     * Render a button for logging in through OAuth
     *
     * @param  {Object} provider
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderOAuthButton: function(provider, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(provider.title) || t(`server-type-${provider.type}`);
        var icon = getServerIcon(provider.type);
        var conn = this.props.database.access(this.props.unauthorizedLocation);
        var url = `${conn.protocol}://${conn.server}` + provider.url;
        return (
            <a key={i} className="button" href={url} onClick={this.handleOAuthButtonClick}>
                <i className={`fa fa-fw fa-${icon}`}></i>
                <span className="label">
                    {name}
                </span>
            </a>
        );
    },

    /**
     * Open a popup window to OAuth provider
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    openPopUpWindow: function(url) {
        return new Promise((resolve, reject) => {
            var width = 800;
            var height = 600;
            var options = {
                width,
                height,
                left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
                top: window.screenTop + Math.round((window.outerHeight - height) / 2),
                toolbar: 'no',
                menubar: 'no',
                status: 'no',
            };
            var pairs = _.map(options, (value, name) => {
                return `${name}=${value}`;
            });
            var win = window.open(url, 'login', pairs.join(','));
            if (win) {
                win.location = url;
                var interval = setInterval(() => {
                    if (win.closed) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            } else {
                reject(new Error('Unable to open popup'))
            }
        });
    },

    /**
     * Signal to parent component that the OAuth login process has completed
     */
    triggerOAuthEndedEvent: function() {
        if (this.props.onOAuthEnded) {
            this.props.onOAuthEnded({
                type: 'oauthcomplete',
                target: this,
            })
        }
    },

    /**
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick: function(evt) {
        var url = evt.currentTarget.getAttribute('href');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            this.triggerOAuthEndedEvent();
        });
    },
});

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}
