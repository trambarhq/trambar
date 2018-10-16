import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import OptionButton from 'widgets/option-button';
import TelephoneNumberDialogBox from 'dialogs/telephone-number-dialog-box';

import './user-view-options.scss';

/**
 * Component that lists a user's social links. It also handles options for
 * different statistics views.
 *
 * @extends PureComponent
 */
class UserViewOptions extends PureComponent {
    static displayName = 'UserViewOptions';

    constructor(props) {
        super(props);
        this.state = {
            showingPhoneDialog: false,
            renderingPhoneDialog: false,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { section } = this.props;
        if (section === 'both') {
            return (
                <div className="user-view-options">
                    {this.renderButtons('main')}
                    <div className="border" />
                    {this.renderButtons('statistics')}
                </div>
            );
        } else {
            return (
                <div className="user-view-options">
                    {this.renderButtons(section)}
                </div>
            );
        }
    }

    /**
     * Render buttons
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderButtons(section) {
        let { env, user, options, selectedDate } = this.props;
        let { t } = env.locale;
        let details = _.get(user, 'details', {});
        if (section === 'main') {
            let {
                phone,
                email,
                skype_username: skypeUsername,
                ichat_username: ichatUsername,
                twitter_username: twitterUsername,
                gitlab_url: gitlabURL,
                github_url: githubURL,
                linkedin_url: linkedinURL,
                stackoverflow_url: stackoverflowURL,
            } = _.get(user, 'details', {});
            let phoneProps = {
                label: t('action-contact-by-phone'),
                icon: 'phone-square',
                url: `tel:${phone}`,
                hidden: !phone,
                onClick: this.handlePhoneClick,
            };
            let emailProps = {
                label: t('action-contact-by-email'),
                icon: 'envelope',
                url: `mailto:${email}`,
                hidden: !email,
                onClick: this.handleLinkClick,
            };
            let skypeProps = {
                label: t('action-contact-by-skype'),
                icon: 'skype',
                url: `skype:${skypeUsername}`,
                hidden: !skypeUsername,
                onClick: this.handleLinkClick,
            };
            let ichatProps = {
                label: t('action-contact-by-ichat'),
                icon: 'apple',
                url: `ichat:${ichatUsername}`,
                hidden: !ichatUsername,
                onClick: this.handleLinkClick,
            };
            let twitterProps = {
                label: t('action-contact-by-twitter'),
                icon: 'twitter',
                url: `https://twitter.com/${twitterUsername}`,
                target: '_blank',
                hidden: !twitterUsername,
                onClick: this.handleLinkClick,
            };
            let gitlabProps = {
                label: t('action-view-gitlab-page'),
                icon: 'gitlab',
                url: gitlabURL,
                target: '_blank',
                hidden: !gitlabURL,
                onClick: this.handleLinkClick,
            };
            let githubProps = {
                label: t('action-view-github-page'),
                icon: 'github',
                url: githubURL,
                target: '_blank',
                hidden: !githubURL,
                onClick: this.handleLinkClick,
            };
            let linkedInProps = {
                label: t('action-view-linkedin-page'),
                icon: 'linkedin',
                url: linkedinURL,
                target: '_blank',
                hidden: !linkedinURL,
                onClick: this.handleLinkClick,
            };
            let stackOverflowProps = {
                label: t('action-view-stackoverflow-page'),
                icon: 'stack-overflow',
                url: stackoverflowURL,
                target: '_blank',
                hidden: !stackoverflowURL,
                onClick: this.handleLinkClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...phoneProps} />
                    <OptionButton {...emailProps} />
                    <OptionButton {...skypeProps} />
                    <OptionButton {...ichatProps} />
                    <OptionButton {...twitterProps}/>
                    <OptionButton {...gitlabProps} />
                    <OptionButton {...githubProps} />
                    <OptionButton {...linkedInProps} />
                    <OptionButton {...stackOverflowProps} />
                    {this.renderPhoneDialog()}
                </div>
            );
        } else {
            let biweekly = (selectedDate) ? 'biweekly' : '14-days';
            let twoWeekProps = {
                label: t(`option-statistics-${biweekly}`),
                selected: options.chartRange === 'biweekly' || !options.chartRange,
                onClick: this.handleBiweeklyActivitiesClick,
            };
            let lastMonthProps = {
                label: t('option-statistics-monthly'),
                selected: options.chartRange === 'monthly',
                onClick: this.handleMonthlyActivitiesClick,
            };
            let toDateProps = {
                label: t('option-statistics-to-date'),
                selected: options.chartRange === 'full',
                onClick: this.handleActivitiesToDateClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...twoWeekProps} />
                    <OptionButton {...lastMonthProps} />
                    <OptionButton {...toDateProps} />
                </div>
            )
        }
    }

    /**
     * Render dialog box showing telephone number
     *
     * @return {ReactElement|null}
     */
    renderPhoneDialog() {
        let { env, user } = this.props;
        let { showingPhoneDialog, renderingPhoneDialog } = this.state;
        if (!renderingPhoneDialog) {
            return null;
        }
        let { phone } = user.details;
        let dialogProps = {
            show: showingPhoneDialog,
            number: phone,
            env,
            onClose: this.handlePhoneDialogClose,
        };
        return <TelephoneNumberDialogBox {...dialogProps} />;
    }

    /**
     * Inform parent component that new options have been selected
     *
     * @param  {Object} changes
     */
    triggerChangeEvent(changes) {
        let { options, onChange } = this.props;
        options = _.assign({}, options, changes);
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                options
            });
        }
    }

    /**
     * Inform parent component that some action has taken place
     *
     * @param  {Object} changes
     */
    triggerCompleteEvent() {
        let { onComplete } = this.props;
        if (onComplete) {
            onComplete({
                type: 'complete',
                target: this,
            });
        }
    }

    /**
     * Called when user click on "contact by phone"
     *
     * @param  {Event} evt
     */
    handlePhoneClick = (evt) => {
        evt.preventDefault();
        this.setState({
            renderingPhoneDialog: true,
            showingPhoneDialog: true,
        });
    }

    /**
     * Called when user closes telephone number dialog
     *
     * @param  {Event} evt
     */
    handlePhoneDialogClose = (evt) => {
        this.setState({ showingPhoneDialog: false }, () => {
            this.triggerCompleteEvent();
            setTimeout(() => {
                let { showingPhoneDialog } = this.state;
                if (!showingPhoneDialog) {
                    this.setState({ renderingPhoneDialog: false });
                }
            }, 500);
        });
    }

    /**
     * Called when user clicks biweekly activities button
     *
     * @param  {Event} evt
     */
    handleBiweeklyActivitiesClick = (evt) => {
        let { options } = this.props;
        let chartRange = 'biweekly';
        let chartType = options.chartType || 'bar';
        this.triggerChangeEvent({ chartRange, chartType });
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks monthly activities button
     *
     * @param  {Event} evt
     */
    handleMonthlyActivitiesClick = (evt) => {
        let { options } = this.props;
        let chartRange = 'monthly';
        let chartType = options.chartType || 'bar';
        this.triggerChangeEvent({ chartRange, chartType });
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks activities to-date button
     *
     * @param  {Event} evt
     */
    handleActivitiesToDateClick = (evt) => {
        let { options } = this.props;
        let chartRange = 'full';
        let chartType = options.chartType || 'bar';
        this.triggerChangeEvent({ chartRange, chartType });
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks a link
     *
     * @param  {Event} evt
     */
    handleLinkClick = (evt) => {
        this.triggerCompleteEvent();
    }
}

UserViewOptions.defaultProps = {
    section: 'both',
};

export {
    UserViewOptions as default,
    UserViewOptions,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserViewOptions.propTypes = {
        section: PropTypes.oneOf([ 'main', 'statistics', 'both' ]),
        user: PropTypes.object,
        options: PropTypes.object.isRequired,
        selectedDate: PropTypes.string,

        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func,
        onComplete: PropTypes.func,
    };
}
