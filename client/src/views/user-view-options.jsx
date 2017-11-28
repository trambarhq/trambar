var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserSection = require('widgets/user-section');
var HeaderButton = require('widgets/header-button');
var OptionButton = require('widgets/option-button');
var TelephoneNumberDialogBox = require('dialogs/telephone-number-dialog-box');

require('./user-view-options.scss');

module.exports = React.createClass({
    displayName: 'UserViewOptions',
    propTypes: {
        inMenu: PropTypes.bool,
        section: PropTypes.oneOf([ 'main', 'supplemental', 'both' ]),
        user: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            inMenu: false,
            section: 'both',
        }
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            showingPhoneDialog: false,
            renderingPhoneDialog: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (this.props.inMenu) {
            return (
                <div className="view-options in-menu">
                    {this.renderButtons(this.props.section)}
                    {this.renderPhoneDialog()}
                </div>
            );
        } else {
            var t = this.props.locale.translate;
            return (
                <UserSection className="view-options">
                    <header>
                        <HeaderButton icon="chevron-circle-right" label={t('user-actions')} disabled />
                    </header>
                    <body>
                        {this.renderButtons('main')}
                        {this.renderPhoneDialog()}
                    </body>
                </UserSection>
            );
        }
    },

    /**
     * Render buttons
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderButtons: function(section) {
        var t = this.props.locale.translate;
        var details = _.get(this.props.user, 'details', {});
        if (section === 'main') {
            var phoneProps = {
                label: t('action-contact-by-phone'),
                icon: 'phone-square',
                url: `tel:${details.phone}`,
                hidden: !details.phone,
                onClick: this.handlePhoneClick,
            };
            var emailProps = {
                label: t('action-contact-by-email'),
                icon: 'envelope',
                url: `mailto:${details.email}`,
                hidden: !details.email,
            };
            var skypeProps = {
                label: t('action-contact-by-skype'),
                icon: 'skype',
                url: `skype:${details.skype_username}`,
                hidden: !details.phone,
            };
            var slackProps = {
                label: t('action-contact-by-slack'),
                icon: 'slack',
                url: `slack://user?team=${details.slack_team_id}&id=${details.slack_user_id}`,
                hidden: !details.slack_user_id,
            };
            var ichatProps = {
                label: t('action-contact-by-ichat'),
                icon: 'apple',
                url: `ichat:${details.ichat_username}`,
                hidden: !details.ichat_username,
            };
            var twitterProps = {
                label: t('action-contact-by-twitter'),
                icon: 'apple',
                url: `https://twitter.com/${details.twitter_username}`,
                target: '_blank',
                hidden: !details.twitter_username,
            };
            var gitlabProps = {
                label: t('action-view-gitlab-page'),
                icon: 'gitlab',
                url: details.gitlab_url,
                target: '_blank',
                hidden: !details.gitlab_url,
            };
            var githubProps = {
                label: t('action-view-github-page'),
                icon: 'github',
                url: details.github_url,
                target: '_blank',
                hidden: !details.linkedin_username,
            };
            var linkedInProps = {
                label: t('action-view-linkedin-page'),
                icon: 'linkedin',
                url: details.linkedin_url,
                target: '_blank',
                hidden: !details.linkedin_url,
            };
            var stackOverflowProps = {
                label: t('action-view-stackoverflow-page'),
                icon: 'stack-overflow',
                url: details.stackoverflow_url,
                target: '_blank',
                hidden: !details.stackoverflow_url,
            };
            return (
                <div className={section}>
                    <OptionButton {...phoneProps} />
                    <OptionButton {...emailProps} />
                    <OptionButton {...skypeProps} />
                    <OptionButton {...slackProps} />
                    <OptionButton {...ichatProps} />
                    <OptionButton {...twitterProps} />
                    <OptionButton {...gitlabProps} />
                    <OptionButton {...githubProps} />
                    <OptionButton {...linkedInProps} />
                    <OptionButton {...stackOverflowProps} />
                </div>
            );
        }
    },

    /**
     * Render dialog box showing telephone number
     *
     * @return {ReactElement}
     */
    renderPhoneDialog: function() {
        if (process.env.PLATFORM !== 'browser') return;

        if (!this.state.renderingPhoneDialog) {
            return null;
        }
        var dialogProps = {
            show: this.state.showingPhoneDialog,
            number: this.props.user.details.phone,
            locale: this.props.locale,
            onClose: this.handlePhoneDialogClose,
        };
        return <TelephoneNumberDialogBox {...dialogProps} />;
    },

    /**
     * Called when user click on "contact by phone"
     *
     * @param  {Event} evt
     */
    handlePhoneClick: function(evt) {
        if (process.env.PLATFORM !== 'browser') return;

        evt.preventDefault();
        this.setState({
            renderingPhoneDialog: true,
            showingPhoneDialog: true,
        });
    },

    /**
     * Called when user closes telephone number dialog
     *
     * @param  {Event} evt
     */
    handlePhoneDialogClose: function(evt) {
        if (process.env.PLATFORM !== 'browser') return;

        this.setState({ showingPhoneDialog: false }, () => {
            setTimeout(() => {
                if (!this.state.showingPhoneDialog) {
                    this.setState({ renderingPhoneDialog: false });
                }
            }, 500);
        });
    }
});
