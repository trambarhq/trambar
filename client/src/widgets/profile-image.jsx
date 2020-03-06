import _ from 'lodash';
import React from 'react';
import { BlobManager } from 'common/transport/blob-manager.js';

// widgets
import { ResourceView }  from 'common/widgets/resource-view.jsx';
import ProfileIcon from 'octicons/build/svg/person.svg';
import InternetIcon from '../../assets/internet.svg';

import './profile-image.scss';

/**
 * Stateless component that renders a user's profile image. If there's none,
 * it renders a placeholder graphic.
 */
export function ProfileImage(props) {
  const { env, href, user, robot, size } = props;
  const className = `profile-image ${size}`;
  const profileImage = _.find(user?.details?.resources, { type: 'image' });
  const imageResolutions = {
    small: 24,
    medium: 48,
    large: 96,
  };
  let image;
  if (profileImage) {
    const imageResolutions = {
      small: 24,
      medium: 48,
      large: 96,
    };
    const width = imageResolutions[size];
    const props = {
      resource: profileImage,
      showMosaic: true,
      width: width,
      height: width,
      env,
    };
    image = <ResourceView {...props} />;
  } else {
    let Icon = ProfileIcon;
    let iconClassName = 'placeholder';
    if (robot) {
      switch (robot.type) {
        case 'traffic':
          Icon = InternetIcon;
          break;
      }
      iconClassName = robot.type;
    }
    image = <div className={iconClassName}><Icon /></div>;
  }
  if (href) {
    return <a className={className} href={href}>{image}</a>;
  } else {
    return <span className={className}>{image}</span>;
  }
}

ProfileImage.defaultProps = {
  size: 'small'
};
