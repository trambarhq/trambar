import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import MultipleUserNames from 'widgets/multiple-user-names';

import './bookmark-view.scss';

class BookmarkView extends PureComponent {
    static displayName = 'BookmarkView';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { highlighting, children } = this.props;
        let className = 'bookmark-view';
        if (highlighting) {
            className += ' highlighting';
        }
        return (
            <div className={className}>
                <div className="title">
                    {this.renderSenderNames()}
                </div>
                <div className="story">
                    {children}
                </div>
            </div>
        );
    }

    /**
     * Render names of senders
     *
     * @return {ReactElement}
     */
    renderSenderNames() {
        let { env, senders, currentUser } = this.props;
        let { t, g } = env.locale;
        let isOwner = _.some(senders, { id: currentUser.id });
        let others = _.filter(senders, (sender) => {
            return sender.id !== currentUser.id;
        });
        let contents;
        if (isOwner) {
            let you = UserUtils.getDisplayName(currentUser, env);
            g(you, currentUser.details.gender);
            if (others.length === 0) {
                contents = t('bookmark-$you-bookmarked-it', you);
            } else if (others.length === 1) {
                let other = others[0];
                let name = UserUtils.getDisplayName(other, env);
                g(name, other.details.gender);
                contents = t('bookmark-$you-bookmarked-it-and-$name-recommends-it', you, name);
            } else {
                let props = {
                    users: others,
                    label: t('bookmark-$count-users', others.length),
                    title: t('bookmark-recommendations'),
                    env,
                };
                let popup = <MultipleUserNames key={1} {...props} />;
                contents = t('bookmark-$you-bookmarked-it-and-$others-recommends-it', you, popup, others.length);
            }
        } else {
            if (others.length === 0) {
                contents = '\u00a0';
            } else if (others.length === 1) {
                let name = UserUtils.getDisplayName(others[0], env);
                g(name, others[0].details.gender);
                contents = t('bookmark-$name-recommends-this', name);
            } else if (others.length === 2) {
                let name1 = UserUtils.getDisplayName(others[0], env);
                let name2 = UserUtils.getDisplayName(others[1], env);
                g(name1, others[0].details.gender);
                g(name2, others[1].details.gender);
                contents = t('bookmark-$name1-and-$name2-recommend-this', name1, name2);
            } else {
                let name1 = UserUtils.getDisplayName(others[0], env);
                let additional = _.slice(others, 1);
                let props = {
                    users: additional,
                    label: t('bookmark-$count-other-users', additional.length),
                    title: t('bookmark-recommendations'),
                    env,
                };
                let popup = <MultipleUserNames key={1} {...props} />;
                g(name1, others[0].details.gender);
                contents = t('bookmark-$name1-and-$others-recommend-this', name1, popup, others.length - 1);
            }
        }
        return <span className="name">{contents}</span>
    }

    /**
     * Remove bookmark from remote database
     *
     * @param  {Bookmark} bookmark
     *
     * @return {Promise<Bookmark>}
     */
    removeBookmark(bookmark) {
        let { database } = this.props;
        let db = database.use({ by: this });
        return db.removeOne({ table: 'bookmark' }, bookmark);
    }

    /**
     * Called when user clicks close button
     *
     * @param  {Event} evt
     */
    handleCloseClick = (evt) => {
        let { bookmark } = this.props;
        this.removeBookmark(bookmark);
    }
}

export {
    BookmarkView as default,
    BookmarkView,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarkView.propTypes = {
        highlighting: PropTypes.bool,
        bookmark: PropTypes.object,
        senders: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
