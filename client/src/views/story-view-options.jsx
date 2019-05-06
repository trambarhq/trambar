import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import OptionButton from '../widgets/option-button.jsx';
import UserSelectionDialogBox from '../dialogs/user-selection-dialog-box';
import IssueDialogBox from '../dialogs/issue-dialog-box';

import './story-view-options.scss';

/**
 * Component that handles the changing of a story's options. It's used for
 * both rendering the options when they appear in a pop-up menu and when they
 * appear within the story view when there's room for the third column.
 *
 * @extends PureComponent
 */
class StoryViewOptions extends PureComponent {
    static displayName = 'StoryViewOptions';

    constructor(props) {
        super(props);
        this.state = {
            selectingRecipients: false,
            enteringIssueDetails: false,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { t } = env.locale;
        return (
            <div className="story-view-options">
                {this.renderButtons('main')}
            </div>
        );
    }

    /**
     * Render list of buttons belonging to specified section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderButtons(section) {
        let { env, story, currentUser, repos, options, access } = this.props;
        let { selectingRecipients, enteringIssueDetails } = this.state;
        let { t } = env.locale;
        if (section === 'main') {
            let bookmarkProps;
            if (options.keepBookmark === undefined) {
                bookmarkProps = {
                    label: t('option-add-bookmark'),
                    selected: (currentUser) ? _.includes(options.bookmarkRecipients, currentUser.id) : false,
                    hidden: !UserUtils.canCreateBookmark(currentUser, story, access),
                    onClick: this.handleAddBookmarkClick,
                };
            } else {
                // viewing in bookmark page
                 bookmarkProps = {
                    label: t('option-keep-bookmark'),
                    selected: options.keepBookmark,
                    onClick: this.handleKeepBookmarkClick,
                };
            }
            let otherRecipients = (currentUser) ? _.without(options.bookmarkRecipients, currentUser.id) : [];
            let sendBookmarkProps = {
                label: _.isEmpty(otherRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(otherRecipients)),
                hidden: !UserUtils.canSendBookmarks(currentUser, story, access),
                selected: !_.isEmpty(otherRecipients) || selectingRecipients,
                onClick: this.handleSendBookmarkClick,
            };
            let addIssueProps = {
                label: t('option-add-issue'),
                hidden: !UserUtils.canAddIssue(currentUser, story, repos, access),
                selected: !!options.issueDetails || enteringIssueDetails,
                onClick: this.handleAddIssueClick,
            };
            let hideProps = {
                label: t('option-hide-story'),
                hidden: !UserUtils.canHideStory(currentUser, story, access),
                selected: options.hideStory,
                onClick: this.handleHideClick,
            };
            let editProps = {
                label: t('option-edit-post'),
                hidden: !UserUtils.canEditStory(currentUser, story, access),
                selected: options.editStory,
                onClick: this.handleEditClick,
            };
            let removeProps = {
                label: t('option-remove-story'),
                hidden: !UserUtils.canRemoveStory(currentUser, story, access),
                selected: options.removeStory,
                onClick: this.handleRemoveClick,
            };
            let bumpProps = {
                label: t('option-bump-story'),
                hidden: !UserUtils.canBumpStory(currentUser, story, access),
                selected: options.bumpStory,
                onClick: this.handleBumpClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...bookmarkProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...hideProps} />
                    <OptionButton {...editProps} />
                    <OptionButton {...removeProps} />
                    <OptionButton {...bumpProps} />
                    {this.renderRecipientDialogBox()}
                    {this.renderIssueDialogBox()}
                </div>
            );
        }
    }

    /**
     * Render dialog for selecting users
     *
     * @return {ReactElement|null}
     */
    renderRecipientDialogBox() {
        let { database, route, env, options } = this.props;
        let { selectingRecipients } = this.state;
        let props = {
            show: selectingRecipients,
            selection: options.bookmarkRecipients,
            database,
            route,
            env,
            onSelect: this.handleRecipientsSelect,
            onCancel: this.handleRecipientsCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    }

    /**
     * Render dialog for entering issue details
     *
     * @return {ReactElement}
     */
    renderIssueDialogBox() {
        let { env, currentUser, story, reactions, repos, options } = this.props;
        let { enteringIssueDetails } = this.state;
        // don't allow issue to be deleted once someone has been assigned to it
        let props = {
            show: enteringIssueDetails,
            allowDeletion: !_.some(reactions, { type: 'assignment '}),
            currentUser,
            story,
            issue: options.issueDetails,
            repos,
            env,
            onConfirm: this.handleIssueConfirm,
            onCancel: this.handleIssueCancel,
        };
        return <IssueDialogBox {...props} />;
    }

    /**
     * Inform parent component that options have been changed
     *
     * @param  {Object} options
     */
    triggerChangeEvent(options) {
        let { onChange } = this.props;
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                options,
            });
        }
    }

    /**
     * Inform parent component the action requested is either done or canceled
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
     * Open dialog box for selecting user
     *
     * @param  {Event} evt
     */
    openSelectionDialogBox(evt) {
        this.setState({ selectingRecipients: true });
    }

    /**
     * Close dialog box
     */
    closeSelectionDialogBox() {
        this.setState({ selectingRecipients: false });
    }

    /**
     * Open dialog box for entering issue details
     *
     * @param  {Event} evt
     */
    openIssueDialogBox(evt) {
        this.setState({ enteringIssueDetails: true });
    }

    /**
     * Close dialog box
     */
    closeIssueDialogBox() {
        this.setState({ enteringIssueDetails: false });
    }

    /**
     * Called when user clicks on add bookmark button
     *
     * @param  {Event} evt
     */
    handleAddBookmarkClick = (evt) => {
        let { options, currentUser } = this.props;
        options = _.clone(options);
        if (_.includes(options.bookmarkRecipients, currentUser.id)) {
            options.bookmarkRecipients = _.without(options.bookmarkRecipients, currentUser.id);
        } else {
            options.bookmarkRecipients = _.concat(options.bookmarkRecipients || [], currentUser.id);
        }
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks on keep bookmark button
     *
     * @param  {Event} evt
     */
    handleKeepBookmarkClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.keepBookmark = false;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks on send bookmark button
     *
     * @param  {Event} evt
     */
    handleSendBookmarkClick = (evt) => {
        this.openSelectionDialogBox(evt);
    }

    /**
     * Called when user clicks on add issue to tracker button
     *
     * @param  {Event} evt
     */
    handleAddIssueClick = (evt) => {
        this.openIssueDialogBox(evt);
    }

    /**
     * Called when user clicks on hide story button
     *
     * @param  {Event} evt
     */
    handleHideClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.hideStory = !options.hideStory;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks on edit story button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.editStory = true;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks on remove story button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.removeStory = true;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks on bump story button
     *
     * @param  {Event} evt
     */
    handleBumpClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.bumpStory = true;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user finishes selecting user
     *
     * @param  {Object} evt
     */
    handleRecipientsSelect = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.bookmarkRecipients = evt.selection;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
        this.closeSelectionDialogBox();
    }

    /**
     * Called when user cancel user selection
     *
     * @param  {Object} evt
     */
    handleRecipientsCancel = (evt) => {
        this.triggerCompleteEvent();
        this.closeSelectionDialogBox();
    }

    /**
     * Called when user finishes entering issue details
     *
     * @param  {Object} evt
     */
    handleIssueConfirm = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.issueDetails = evt.issue;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
        this.closeIssueDialogBox();
    }

    /**
     * Called when user cancel editing of issue details
     *
     * @param  {Object} evt
     */
    handleIssueCancel = (evt) => {
        this.triggerCompleteEvent();
        this.closeIssueDialogBox();
    }
}

StoryViewOptions.defaultProps = {
    section: 'both',
};

export {
    StoryViewOptions as default,
    StoryViewOptions,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryViewOptions.propTypes = {
        section: PropTypes.oneOf([ 'main', 'both' ]),
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        story: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func,
        onComplete: PropTypes.func,
    };
}
