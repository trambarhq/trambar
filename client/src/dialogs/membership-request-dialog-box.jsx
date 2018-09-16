import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ResourceView from 'widgets/resource-view';
import Scrollable from 'widgets/scrollable';
import CollapsibleContainer from 'widgets/collapsible-container';

import './membership-request-dialog-box.scss';

class MembershipRequestDialogBox extends PureComponent {
    static displayName = 'MembershipRequestDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            userJustJoined: false
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCloseClick,
        };
        let classNames = [ 'membership-request-dialog-box' ];
        return (
            <Overlay {...overlayProps}>
                <div className={classNames.join(' ')}>
                    {this.renderText()}
                    {this.renderMessage()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render description of project
     *
     * @return {ReactElement}
     */
    renderText() {
        let p = this.props.locale.pick;
        let project = this.props.project;
        let image = _.find(project.details.resources, { type: 'image' });
        return (
            <Scrollable>
                <div className="title">{p(project.details.title) || project.name}</div>
                <div className="description">
                    <div className="image">
                        <ResourceView resource={image} width={160} theme={this.props.theme} />
                    </div>
                    {p(project.details.description)}
                </div>
            </Scrollable>
        );
    }

    /**
     * Render message about member status
     *
     * @return {ReactElement|null}
     */
    renderMessage() {
        let t = this.props.locale.translate;
        let n = this.props.locale.name;
        let user = this.props.currentUser;
        let project = this.props.project;
        let you = (user) ? n(user.details.name, user.details.gender) : null;
        let className = '', icon = '', message = '';
        if (UserUtils.isMember(user, project)) {
            className = 'accepted';
            icon = 'user-circle-o';
            if (this.state.userJustJoined) {
                message = t('membership-request-$you-are-now-member', you);
            } else {
                message = t('membership-request-$you-are-member', you);
            }
        } else if (UserUtils.isPendingMember(user, project)) {
            className = 'requested';
            icon = 'clock-o';
            message = t('membership-request-$you-have-requested-membership', you);
        }
        return (
            <CollapsibleContainer open={!!icon}>
                <div className={`message ${className}`}>
                    <i className={`fa fa-${icon}`} />
                    {' '}
                    {message}
                </div>
            </CollapsibleContainer>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let user = this.props.currentUser;
        let project = this.props.project;
        if (UserUtils.isMember(user, project)) {
            let cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            let proceedButtonProps = {
                label: t('membership-request-proceed'),
                onClick: this.handleProceedClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...proceedButtonProps} />
                </div>
            );
        } else if (UserUtils.isPendingMember(user, project)) {
            let cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            let withdrawButtonProps = {
                label: t('membership-request-withdraw'),
                onClick: this.handleWithdrawClick,
            };
            let browseButtonProps = {
                label: t('membership-request-browse'),
                onClick: this.handleProceedClick,
                hidden: !UserUtils.canViewProject(user, project),
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...withdrawButtonProps} />
                    <PushButton {...browseButtonProps} />
                </div>
            );
        } else {
            let cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            let browseButtonProps = {
                label: t('membership-request-browse'),
                onClick: this.handleProceedClick,
                hidden: !UserUtils.canViewProject(user, project),
                emphasized: !UserUtils.canJoinProject(user, project),
            };
            let joinButtonProps = {
                label: t('membership-request-join'),
                onClick: this.handleJoinClick,
                hidden: !UserUtils.canJoinProject(user, project),
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...browseButtonProps} />
                    <PushButton {...joinButtonProps} />
                </div>
            );
        }
    }

    /**
     * Called when user click join button
     *
     * @param  {Event} evt
     */
    handleJoinClick = (evt) => {
        this.setState({ userJustJoined: true });
        if (this.props.onConfirm) {
            this.props.onConfirm({ type: 'confirm', target: this });
        }
    }

    /**
     * Called when user click withdraw button
     *
     * @param  {Event} evt
     */
    handleWithdrawClick = (evt) => {
        if (this.props.onRevoke) {
            this.props.onRevoke({ type: 'revoke', target: this });
        }
    }

    /**
     * Called when user click cancel or ok button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCloseClick = (evt) => {
        if (this.props.onClose) {
            this.props.onClose({ type: 'cancel', target: this });
        }
    }

    /**
     * Called when user click proceed button
     *
     * @param  {Event} evt
     */
    handleProceedClick = (evt) => {
        if (this.props.onProceed) {
            this.props.onProceed({ type: 'proceed', target: this });
        }
    }
}

export {
    MembershipRequestDialogBox as default,
    MembershipRequestDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MembershipRequestDialogBox.propTypes = {
        show: PropTypes.bool,
        currentUser: PropTypes.object.isRequired,
        project: PropTypes.object.isRequired,

        env: PropTypes.instanceOf(Environment).isRequired,

        onConfirm: PropTypes.func,
        onRevoke: PropTypes.func,
        onClose: PropTypes.func,
        onProceed: PropTypes.func,
    };
}
