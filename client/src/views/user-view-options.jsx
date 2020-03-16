import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';

// widgets
import { OptionButton } from '../widgets/option-button.jsx';
import { TelephoneNumberDialogBox } from '../dialogs/telephone-number-dialog-box.jsx';

import './user-view-options.scss';

/**
 * Component that lists a user's social links. It also handles options for
 * different statistics views.
 */
export function UserViewOptions(props) {
  const { env, user, options, section, selectedDate } = props;
  const { onChange, onComplete } = props;
  const { t } = env.locale;
  const [ showingPhoneNumber, showPhoneNumber ] = useState(false);

  const handlePhoneClick = useListener((evt) => {
    if (env.platform === 'browser') {
      evt.preventDefault();
      showPhoneNumber(true);
    }
  });
  const handlePhoneDialogClose = useListener((evt) => {
    showPhoneNumber(false);
    done();
  });
  const handleBiweeklyActivitiesClick = useListener((evt) => {
    getChartRange('biweekly');
  });
  const handleMonthlyActivitiesClick = useListener((evt) => {
    getChartRange('monthly');
  });
  const handleActivitiesToDateClick = useListener((evt) => {
    getChartRange('full');
  });
  const handleLinkClick = useListener((evt) => {
    done();
  });

  function getChartRange(chartRange) {
    const changes = { chartRange };
    if (!options.current.chartType) {
      changes.chartType = 'bar';
    }
    options.assign(changes);
    done();
  }

  function done() {
    if (onComplete) {
      onComplete({});
    }
  }

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
      } = user?.details ?? {};
      const phoneProps = {
        label: t('action-contact-by-phone'),
        iconClass: 'fas fa-phone-square-alt',
        url: `tel:${phone}`,
        hidden: !phone,
        onClick: handlePhoneClick,
      };
      const emailProps = {
        label: t('action-contact-by-email'),
        iconClass: 'fas fa-envelope',
        url: `mailto:${email}`,
        hidden: !email,
        onClick: handleLinkClick,
      };
      const skypeProps = {
        label: t('action-contact-by-skype'),
        iconClass: 'fab fa-skype',
        url: `skype:${skypeUsername}?chat`,
        hidden: !skypeUsername,
        onClick: handleLinkClick,
      };
      const ichatProps = {
        label: t('action-contact-by-ichat'),
        iconClass: 'fab fa-apple',
        url: `ichat:${ichatUsername}`,
        hidden: !ichatUsername,
        onClick: handleLinkClick,
      };
      const twitterProps = {
        label: t('action-contact-by-twitter'),
        iconClass: 'fab fa-twitter-square',
        url: `https://twitter.com/${twitterUsername}`,
        target: '_blank',
        hidden: !twitterUsername,
        onClick: handleLinkClick,
      };
      const gitlabProps = {
        label: t('action-view-gitlab-page'),
        iconClass: 'fab fa-gitlab',
        url: gitlabURL,
        target: '_blank',
        hidden: !gitlabURL,
        onClick: handleLinkClick,
      };
      const githubProps = {
        label: t('action-view-github-page'),
        iconClass: 'fab fa-github-square',
        url: githubURL,
        target: '_blank',
        hidden: !githubURL,
        onClick: handleLinkClick,
      };
      const linkedInProps = {
        label: t('action-view-linkedin-page'),
        iconClass: 'fab fa-linkedin',
        url: linkedinURL,
        target: '_blank',
        hidden: !linkedinURL,
        onClick: handleLinkClick,
      };
      const stackOverflowProps = {
        label: t('action-view-stackoverflow-page'),
        iconClass: 'fab fa-stack-overflow',
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
      const { chartRange } = options.current;
      const twoWeekProps = {
        label: t(`option-statistics-${biweekly}`),
        selected: (chartRange === 'biweekly' || !chartRange),
        onClick: handleBiweeklyActivitiesClick,
      };
      const lastMonthProps = {
        label: t('option-statistics-monthly'),
        selected: (chartRange === 'monthly'),
        onClick: handleMonthlyActivitiesClick,
      };
      const toDateProps = {
        label: t('option-statistics-to-date'),
        selected: (chartRange === 'full'),
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
