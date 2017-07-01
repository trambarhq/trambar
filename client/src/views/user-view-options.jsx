var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserSection = require('widgets/user-section');
var HeaderButton = require('widgets/header-button');
var OptionButton = require('widgets/option-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');

require('./user-view-options.scss');

module.exports = React.createClass({
    displayName: 'UserViewOptions',
    propTypes: {
        inMenu: PropTypes.bool,
        section: PropTypes.oneOf([ 'main', 'supplemental', 'both' ]),
        user: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            inMenu: false,
            section: 'both',
        }
    },

    getInitialState: function() {
        return {
            selectingRecipients: false,
        };
    },

    render: function() {
        if (this.props.inMenu) {
            return (
                <div className="view-options in-menu">
                    {this.renderButtons(this.props.section)}
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
                    </body>
                </UserSection>
            );
        }
    },

    renderButtons: function(section) {
        var t = this.props.locale.translate;
        if (section === 'main') {
            var phoneProps = {
                label: t('action-contact-by-phone'),
                icon: 'phone-square',
                url: 'tel:',
            };
            var emailProps = {
                label: t('action-contact-by-email'),
                icon: 'envelope',
                url: 'mailto:'
            };
            var skypeProps = {
                label: t('action-contact-by-skype'),
                icon: 'skype',
                url: 'skype:'
            };
            var slackProps = {
                label: t('action-contact-by-slack'),
                icon: 'slack',
            };
            var ichatProps = {
                label: t('action-contact-by-ichat'),
                icon: 'apple',
                url: 'ichat:'
            };
            var gitlabProps = {
                label: t('action-view-gitlab-page'),
                icon: 'gitlab',
            };
            var githubProps = {
                label: t('action-view-github-page'),
                icon: 'github',
            };
            var stackOverflowProps = {
                label: t('action-view-stackoverflow-page'),
                icon: 'stack-overflow',
            };
            return (
                <div className={section}>
                    <OptionButton {...phoneProps} />
                    <OptionButton {...emailProps} />
                    <OptionButton {...skypeProps} />
                    <OptionButton {...slackProps} />
                    <OptionButton {...ichatProps} />
                    <OptionButton {...gitlabProps} />
                    <OptionButton {...githubProps} />
                    <OptionButton {...stackOverflowProps} />
                </div>
            );
        }
    },

    handlePhoneClick: function(evt) {
    },
});
