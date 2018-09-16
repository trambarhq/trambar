import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import OptionButton from 'widgets/option-button';
import TelephoneNumberDialogBox from 'dialogs/telephone-number-dialog-box';

import './user-view-options.scss';

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
        if (this.props.section === 'both') {
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
                    {this.renderButtons(this.props.section)}
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
        let t = this.props.locale.translate;
        let details = _.get(this.props.user, 'details', {});
        if (section === 'main') {
            let phoneProps = {
                label: t('action-contact-by-phone'),
                icon: 'phone-square',
                url: `tel:${details.phone}`,
                hidden: !details.phone,
                onClick: this.handlePhoneClick,
            };
            let emailProps = {
                label: t('action-contact-by-email'),
                icon: 'envelope',
                url: `mailto:${details.email}`,
                hidden: !details.email,
                onClick: this.handleLinkClick,
            };
            let skypeProps = {
                label: t('action-contact-by-skype'),
                icon: 'skype',
                url: `skype:${details.skype_username}`,
                hidden: !details.skype_username,
                onClick: this.handleLinkClick,
            };
            let ichatProps = {
                label: t('action-contact-by-ichat'),
                icon: 'apple',
                url: `ichat:${details.ichat_username}`,
                hidden: !details.ichat_username,
                onClick: this.handleLinkClick,
            };
            let twitterProps = {
                label: t('action-contact-by-twitter'),
                icon: 'twitter',
                url: `https://twitter.com/${details.twitter_username}`,
                target: '_blank',
                hidden: !details.twitter_username,
                onClick: this.handleLinkClick,
            };
            let gitlabProps = {
                label: t('action-view-gitlab-page'),
                icon: 'gitlab',
                url: details.gitlab_url,
                target: '_blank',
                hidden: !details.gitlab_url,
                onClick: this.handleLinkClick,
            };
            let githubProps = {
                label: t('action-view-github-page'),
                icon: 'github',
                url: details.github_url,
                target: '_blank',
                hidden: !details.github_url,
                onClick: this.handleLinkClick,
            };
            let linkedInProps = {
                label: t('action-view-linkedin-page'),
                icon: 'linkedin',
                url: details.linkedin_url,
                target: '_blank',
                hidden: !details.linkedin_url,
                onClick: this.handleLinkClick,
            };
            let stackOverflowProps = {
                label: t('action-view-stackoverflow-page'),
                icon: 'stack-overflow',
                url: details.stackoverflow_url,
                target: '_blank',
                hidden: !details.stackoverflow_url,
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
            let options = this.props.options;
            let twoWeekProps = {
                label: t('option-statistics-biweekly'),
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
        if (process.env.PLATFORM !== 'browser') return null;

        if (!this.state.renderingPhoneDialog) {
            return null;
        }
        let dialogProps = {
            show: this.state.showingPhoneDialog,
            number: this.props.user.details.phone,
            locale: this.props.locale,
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
        let options = _.assign({}, this.props.options, changes);
        if (this.props.onChange) {
            this.props.onChange({
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
        if (this.props.onComplete) {
            this.props.onComplete({
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
        if (process.env.PLATFORM !== 'browser') return;

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
        if (process.env.PLATFORM !== 'browser') return;

        this.setState({ showingPhoneDialog: false }, () => {
            this.triggerCompleteEvent();
            setTimeout(() => {
                if (!this.state.showingPhoneDialog) {
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
        let chartRange = 'biweekly';
        let chartType = this.props.options.chartType || 'bar';
        this.triggerChangeEvent({ chartRange, chartType });
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks monthly activities button
     *
     * @param  {Event} evt
     */
    handleMonthlyActivitiesClick = (evt) => {
        let chartRange = 'monthly';
        let chartType = this.props.options.chartType || 'bar';
        this.triggerChangeEvent({ chartRange, chartType });
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks activities to-date button
     *
     * @param  {Event} evt
     */
    handleActivitiesToDateClick = (evt) => {
        let chartRange = 'full';
        let chartType = this.props.options.chartType || 'bar';
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

        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func,
        onComplete: PropTypes.func,
    };
}
