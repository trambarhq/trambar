import _ from 'lodash';
import React from 'react';
import * as BlobManager from 'common/transport/blob-manager.mjs';
import { ResourceView }  from 'common/widgets/resource-view.jsx';

import ProfileIcon from 'octicons/build/svg/person.svg';
import InternetIcon from '../../assets/internet.svg';

import './profile-image.scss';

/**
 * Stateless component that renders a user's profile image. If there's none,
 * it renders a placeholder graphic.
 */
function ProfileImage(props) {
  const { env, href, user, robot, size } = props;
  const className = `profile-image ${size}`;
  const profileImage = _.find(user?.details?.resources, { type: 'image' });
  let image;
  if (profileImage) {
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

const imageResolutions = {
  small: 24,
  medium: 48,
  large: 96,
};

ProfileImage.defaultProps = {
  size: 'small'
};

export {
  ProfileImage as default,
  ProfileImage,
};
