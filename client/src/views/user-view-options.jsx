import _ from 'lodash';
import React, { useState, useCallback } from 'react';

// widgets
import { OptionButton } from '../widgets/option-button.jsx';
import { TelephoneNumberDialogBox } from '../dialogs/telephone-number-dialog-box';

import './user-view-options.scss';

/**
 * Component that lists a user's social links. It also handles options for
 * different statistics views.
 */
function UserViewOptions(props) {
    const { env, user, options, section, selectedDate } = props;
    const { onChange, onComplete } = props;
    const { t } = env.locale;
    const [ showingPhoneNumber, showPhoneNumber ] = useState(false);

    const handlePhoneClick = useCallback((evt) => {
        if (env.platform === 'browser') {
            evt.preventDefault();
            showPhoneNumber(true);
        }
    });
    const handlePhoneDialogClose = useCallback((evt) => {
        showPhoneNumber(false);
        if (onComplete) {
            onComplete({});
        }
    }, [ onComplete ]);
    const handleBiweeklyActivitiesClick = useCallback((evt) => {
        const newOptions = {
            ...options,
            chartRange: 'biweekly',
            chartType: options.chartType || 'bar'
        };
        if (onChange) {
            onChange({ options: newOptions });
        }
        if (onComplete) {
            onComplete({});
        }
    }, [ options, onChange, onComplete ]);
    const handleMonthlyActivitiesClick = useCallback((evt) => {
        const newOptions = {
            ...options,
            chartRange: 'monthly',
            chartType: options.chartType || 'bar'
        };
        if (onChange) {
            onChange({ options: newOptions });
        }
        if (onComplete) {
            onComplete({});
        }
    }, [ options, onChange, onComplete ]);
    const handleActivitiesToDateClick = useCallback((evt) => {
        const newOptions = {
            ...options,
            chartRange: 'full',
            chartType: options.chartType || 'bar'
        };
        if (onChange) {
            onChange({ options: newOptions });
        }
        if (onComplete) {
            onComplete({});
        }
    }, [ options, onChange, onComplete ]);
    const handleLinkClick = useCallback((evt) => {
        if (onComplete) {
            onComplete({});
        }
    }, [ onComplete ]);

    if (section === 'both') {
        return (
            <div className="user-view-options">
                {renderButtons('main')}
                <div className="border" />
                {renderButtons('statistics')}
            </div>
        );
    } else {
        return (
            <div className="user-view-options">
                {renderButtons(section)}
            </div>
        );
    }

    function renderButtons(section) {
        const details = _.get(user, 'details', {});
        if (section === 'main') {
            const {
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
            const phoneProps = {
                label: t('action-contact-by-phone'),
                icon: 'phone-square',
                url: `tel:${phone}`,
                hidden: !phone,
                onClick: handlePhoneClick,
            };
            const emailProps = {
                label: t('action-contact-by-email'),
                icon: 'envelope',
                url: `mailto:${email}`,
                hidden: !email,
                onClick: handleLinkClick,
            };
            const skypeProps = {
                label: t('action-contact-by-skype'),
                icon: 'skype',
                url: `skype:${skypeUsername}?chat`,
                hidden: !skypeUsername,
                onClick: handleLinkClick,
            };
            const ichatProps = {
                label: t('action-contact-by-ichat'),
                icon: 'apple',
                url: `ichat:${ichatUsername}`,
                hidden: !ichatUsername,
                onClick: handleLinkClick,
            };
            const twitterProps = {
                label: t('action-contact-by-twitter'),
                icon: 'twitter',
                url: `https://twitter.com/${twitterUsername}`,
                target: '_blank',
                hidden: !twitterUsername,
                onClick: handleLinkClick,
            };
            const gitlabProps = {
                label: t('action-view-gitlab-page'),
                icon: 'gitlab',
                url: gitlabURL,
                target: '_blank',
                hidden: !gitlabURL,
                onClick: handleLinkClick,
            };
            const githubProps = {
                label: t('action-view-github-page'),
                icon: 'github',
                url: githubURL,
                target: '_blank',
                hidden: !githubURL,
                onClick: handleLinkClick,
            };
            const linkedInProps = {
                label: t('action-view-linkedin-page'),
                icon: 'linkedin',
                url: linkedinURL,
                target: '_blank',
                hidden: !linkedinURL,
                onClick: handleLinkClick,
            };
            const stackOverflowProps = {
                label: t('action-view-stackoverflow-page'),
                icon: 'stack-overflow',
                url: stackoverflowURL,
                target: '_blank',
                hidden: !stackoverflowURL,
                onClick: handleLinkClick,
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
                    {renderPhoneDialog()}
                </div>
            );
        } else {
            const biweekly = (selectedDate) ? 'biweekly' : '14-days';
            const twoWeekProps = {
                label: t(`option-statistics-${biweekly}`),
                selected: options.chartRange === 'biweekly' || !options.chartRange,
                onClick: handleBiweeklyActivitiesClick,
            };
            const lastMonthProps = {
                label: t('option-statistics-monthly'),
                selected: options.chartRange === 'monthly',
                onClick: handleMonthlyActivitiesClick,
            };
            const toDateProps = {
                label: t('option-statistics-to-date'),
                selected: options.chartRange === 'full',
                onClick: handleActivitiesToDateClick,
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

    function renderPhoneDialog() {
        const { phone } = user.details;
        const dialogProps = {
            show: showingPhoneNumber,
            number: phone,
            env,
            onClose: handlePhoneDialogClose,
        };
        return <TelephoneNumberDialogBox {...dialogProps} />;
    }
}

UserViewOptions.defaultProps = {
    section: 'both',
};

export {
    UserViewOptions as default,
    UserViewOptions,
};
