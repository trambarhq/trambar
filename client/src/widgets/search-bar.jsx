import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import ComponentRefs from 'utils/component-refs';
import DateTracker from 'utils/date-tracker';
import TagScanner from 'utils/tag-scanner';
import StatisticsFinder from 'objects/finders/statistics-finder';
import UserFinder from 'objects/finders/user-finder';

import './search-bar.scss';

class SearchBar extends AsyncComponent {
    static displayName = 'SearchBar';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var currentUserId;
        var props = {
            dailyActivities: null,

            settings: this.props.settings,
            route: this.props.route,
            locale: this.props.locale,
        };
        meanwhile.show(<SearchBarSync {...props} />);
        return db.start().then((userId) => {
            return UserFinder.findUser(db, userId);
        }).then((user) => {
            var params = _.clone(this.props.settings.statistics);
            if (params.user_id === 'current') {
                params.user_id = user.id;
            }
            if (params.public === 'guest') {
                params.public = (user.type === 'guest');
            }
            return StatisticsFinder.find(db, params);
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return <SearchBarSync {...props} />;
        });
    }
}

class SearchBarSync extends PureComponent {
    static displayName = 'SearchBar.Sync';

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState() {
        this.components = ComponentRefs({
            tags: HTMLDivElement,
        });
        var route = this.props.route;
        var keywords = route.query.search || '';
        return {
            keywords: keywords,
            hashTags: extractTags(this.props.dailyActivities),
            selectedHashTags: findTags(keywords),
        };
    }

    /**
     * Update keywords if necessary
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.route !== nextProps.route) {
            var route = nextProps.route;
            var keywordsBefore = this.state.keywords;
            var keywordsAfter = route.query.search || '';
            if (!_.isEqual(normalize(keywordsBefore), normalize(keywordsAfter))) {
                this.setState({
                    keywords: keywordsAfter,
                    selectedHashTags: findTags(keywordsAfter),
                });
            }
        }
        if (this.props.dailyActivities !== nextProps.dailyActivities) {
            var hashTags = extractTags(nextProps.dailyActivities);
            this.setState({ hashTags });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="search-bar">
                {this.renderTextInput()}
                {this.renderHashTags()}
            </div>
        );
    }

    renderTextInput() {
        var t = this.props.locale.translate;
        var inputProps = {
            type: 'text',
            value: this.state.keywords,
            placeholder: t('search-bar-keywords'),
            onChange: this.handleTextChange,
            onKeyDown: this.handleKeyDown,
            onFocus: this.handleFocus,
        };
        return (
            <div className="text-input">
                <input {...inputProps} />
            </div>
        );
    }

    /**
     * Render list of hash tags
     *
     * @return {ReactElement}
     */
    renderHashTags() {
        var setters = this.components.setters;
        return (
            <div ref={setters.tags} className="tags">
            {
                _.map(this.state.hashTags, (tag, index) => {
                    return this.renderHashTag(tag, index);
                })
            }
            </div>
        );
    }

    /**
     * Render a hash tag
     *
     * @param  {Object} tag
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderHashTag(tag, index) {
        var route = this.props.route;
        var params = _.assign({ search: tag.name }, this.props.settings.route);
        var url = route.find(route.component, params);
        var props = {
            className: 'tag',
            onClick: this.handleHashTagClick,
            'data-tag': tag.name,
            href: url
        };
        if (_.includes(this.state.selectedHashTags, _.toLower(tag.name))) {
            props.className += ' selected'
        }
        return <a key={index} {...props}>{tag.name}</a>;
    }

    /**
     * Attach handler for resize
     */
    componentDidMount() {
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * Adjust tags visibility based on popularity upon redraw
     */
    componentDidUpdate() {
        this.hideUnpopularTags();
    }

    /**
     * Remove resize handler
     */
    componentDidMount() {
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * Hide less popular tags until the remaining fit on one line
     */
    hideUnpopularTags() {
        var container = this.components.tags;
        if (container) {
            // first, make all node visible
            var nodes = {};
            _.each(container.children, (node) => {
                if (node.style.display === 'none') {
                    node.style.display = '';
                }
                var tag = node.getAttribute('data-tag');
                nodes[tag] = node;
            });
            var tagsByPopularity = _.sortBy(this.state.hashTags, 'score');
            while (isWrapping(nodes)) {
                var tag = tagsByPopularity.shift();
                if (tag) {
                    var node = nodes[tag.name];
                    delete nodes[tag.name];
                    node.style.display = 'none';
                } else {
                    break;
                }
            }
        }
    }

    /**
     * Perform search by inserting search terms into URL
     */
    performSearch() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.search = normalize(this.state.keywords);
        route.push(route.component, params);
    }

    /**
     * Called when user changes search string
     *
     * @param  {Event} evt
     */
    handleTextChange = (evt) => {
        var text = evt.target.value;
        var tags = findTags(text);
        this.setState({
            keywords: text,
            selectedHashTags: tags
        });
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.performSearch, 800);
    }

    /**
     * Called when user press a key
     *
     * @param  {Evt} evt
     */
    handleKeyDown = (evt) => {
        if (evt.keyCode === 13) {
            this.performSearch();
        }
    }

    /**
     * Called when input field received focus
     *
     * @param  {Event} evt
     */
    handleFocus = (evt) => {
        var target = evt.target;
        target.selectionStart = 0;
        target.selectionEnd = target.value.length;
    }

    /**
     * Called when user clicks on a tag
     *
     * @param  {Event} evt
     */
    handleHashTagClick = (evt) => {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    /**
     * Called when user resizes the browser window
     *
     * @param  {Event} evt
     */
    handleWindowResize = (evt) => {
        this.hideUnpopularTags();
    }
}

function normalize(s) {
    s = _.replace(s, /\+/g, '');
    s = _.replace(s, /\s+/g, ' ')
    var words = _.split(s);
    return words.join(' ');
}

function findTags(s) {
    return _.map(TagScanner.findTags(s), _.toLower);
}

function isWrapping(nodes) {
    var top;
    return _.some(nodes, (node) => {
        if (top === undefined) {
            top = node.offsetTop;
        } else if (node.offsetTop > top) {
            return true;
        }
    });
}

function extractTags(dailyActivities) {
    if (!dailyActivities) {
        return [];
    }
    // score the tags based on how often they are used
    var scores = {}, frequency = {};
    _.each(dailyActivities.daily, (activities, date) => {
        _.each(activities, (count, key) => {
            // more recent usage count for more
            var multiplier;
            if (date === DateTracker.today) {
                multiplier = 4;
            } else if (date === DateTracker.yesterday) {
                multiplier = 2;
            } else if (date >= DateTracker.oneWeekAgo) {
                multiplier = 1;
            } else if (date >= DateTracker.twoWeeksAgo) {
                multiplier = 0.5;
            } else {
                multiplier = 0.25;
            }
            if (/^#/.test(key)) {
                var score = count * multiplier;
                scores[key] = (scores[key] || 0) + score;
                frequency[key] = (frequency[key] || 0) + count;
            }
        });
    });
    // compare tags that only differ in case
    var nameLists = {};
    var scoresLC = {};
    _.each(scores, (score, name) => {
        var nameLC = _.toLower(name);
        var names = nameLists[nameLC];
        if (!names) {
            names = nameLists[nameLC] = [];
        }
        names.push(name);
        scoresLC[nameLC] = (scoresLC[nameLC] || 0) + score;
    });
    var scoresMC = {};
    _.each(scoresLC, (score, nameLC) => {
        var names = nameLists[nameLC];
        if (names.length > 1) {
            // choice the more frequently used name
            names = _.orderBy(names, (name) => {
                return frequency[name];
            }, 'desc');
        }
        var name = names[0];
        scoresMC[name] = score;
    });

    var hashTags = _.transform(scoresMC, (list, score, name) => {
        list.push({ name, score });
    }, []);
    // sort in case-sensitive manner, as it's done in Gitlab
    return _.sortBy(hashTags, 'name');
}

export {
    SearchBar as default,
    SearchBar,
    SearchBarSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    SearchBar.propTypes = {
        settings: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),
        locale: PropTypes.instanceOf(Locale),
    };
    SearchBarSync.propTypes = {
        settings: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,
        route: PropTypes.instanceOf(Route),
        locale: PropTypes.instanceOf(Locale),
    };
}
