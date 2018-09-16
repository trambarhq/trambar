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
        let className = 'bookmark-view';
        if (this.props.highlighting) {
            className += ' highlighting';
        }
        return (
            <div className={className}>
                <div className="title">
                    {this.renderSenderNames()}
                </div>
                <div className="story">
                    {this.props.children}
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
        let t = this.props.locale.translate;
        let userId = _.get(this.props.currentUser, 'id');
        let isOwner = _.some(this.props.senders, { id: userId });
        let others = _.filter(this.props.senders, (s) => {
            return s.id !== userId;
        });
        let contents;
        if (isOwner) {
            let user = this.props.currentUser;
            let you = UserUtils.getDisplayNameWithGender(user, this.props.locale);
            switch(others.length) {
                case 0:
                    contents = t('bookmark-$you-bookmarked-it', you);
                    break;
                case 1:
                    let name = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    contents = t('bookmark-$you-bookmarked-it-and-$name-recommends-it', you, name);
                    break;
                default:
                    let props = {
                        users: others,
                        label: t('bookmark-$count-users', others.length),
                        title: t('bookmark-recommendations'),
                        locale: this.props.locale,
                        theme: this.props.theme,
                    };
                    let popup = <MultipleUserNames key={1} {...props} />;
                    contents = t('bookmark-$you-bookmarked-it-and-$others-recommends-it', you, popup, others.length);
            }
        } else {
            switch (others.length) {
                case 0:
                    contents = '\u00a0';
                    break;
                case 1:
                    let name = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    contents = t('bookmark-$name-recommends-this', name);
                    break;
                case 2:
                    let name1 = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    let name2 = UserUtils.getDisplayNameWithGender(others[1], this.props.locale);
                    contents = t('bookmark-$name1-and-$name2-recommend-this', name1, name2);
                    break;
                default:
                    let name = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    let additional = _.slice(others, 1);
                    let props = {
                        users: additional,
                        label: t('bookmark-$count-other-users', additional.length),
                        title: t('bookmark-recommendations'),
                        locale: this.props.locale,
                        theme: this.props.theme,
                    };
                    let popup = <MultipleUserNames key={1} {...props} />;
                    contents = t('bookmark-$name1-and-$others-recommend-this', name, popup, others.length - 1);
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
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.removeOne({ table: 'bookmark' }, bookmark);
    }

    /**
     * Called when user clicks close button
     *
     * @param  {Event} evt
     */
    handleCloseClick = (evt) => {
        this.removeBookmark(this.props.bookmark);
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
