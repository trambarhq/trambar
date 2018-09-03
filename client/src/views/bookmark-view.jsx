import _ from 'lodash';
import React, { PureComponent } from 'react';
import UserUtils from 'objects/utils/user-utils';

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
        var className = 'bookmark-view';
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
        var t = this.props.locale.translate;
        var userId = _.get(this.props.currentUser, 'id');
        var isOwner = _.some(this.props.senders, { id: userId });
        var others = _.filter(this.props.senders, (s) => {
            return s.id !== userId;
        });
        var contents;
        if (isOwner) {
            var user = this.props.currentUser;
            var you = UserUtils.getDisplayNameWithGender(user, this.props.locale);
            switch(others.length) {
                case 0:
                    contents = t('bookmark-$you-bookmarked-it', you);
                    break;
                case 1:
                    var name = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    contents = t('bookmark-$you-bookmarked-it-and-$name-recommends-it', you, name);
                    break;
                default:
                    var props = {
                        users: others,
                        label: t('bookmark-$count-users', others.length),
                        title: t('bookmark-recommendations'),
                        locale: this.props.locale,
                        theme: this.props.theme,
                    };
                    var popup = <MultipleUserNames key={1} {...props} />;
                    contents = t('bookmark-$you-bookmarked-it-and-$others-recommends-it', you, popup, others.length);
            }
        } else {
            switch (others.length) {
                case 0:
                    contents = '\u00a0';
                    break;
                case 1:
                    var name = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    contents = t('bookmark-$name-recommends-this', name);
                    break;
                case 2:
                    var name1 = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    var name2 = UserUtils.getDisplayNameWithGender(others[1], this.props.locale);
                    contents = t('bookmark-$name1-and-$name2-recommend-this', name1, name2);
                    break;
                default:
                    var name = UserUtils.getDisplayNameWithGender(others[0], this.props.locale);
                    var additional = _.slice(others, 1);
                    var props = {
                        users: additional,
                        label: t('bookmark-$count-other-users', additional.length),
                        title: t('bookmark-recommendations'),
                        locale: this.props.locale,
                        theme: this.props.theme,
                    };
                    var popup = <MultipleUserNames key={1} {...props} />;
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
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
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
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarkView.propTypes = {
        highlighting: PropTypes.bool,
        bookmark: PropTypes.object,
        senders: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
