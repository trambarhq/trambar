var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ComponentRefs = require('utils/component-refs');
var DateTracker = require('utils/date-tracker');
var DateUtils = require('utils/date-utils');
var TagScanner = require('utils/tag-scanner');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

require('./search-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'SearchBar',
    propTypes: {
        settings: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),
        locale: PropTypes.instanceOf(Locale),
    },

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var currentUserId;
        var props = {
            dailyActivities: null,

            settings: this.props.settings,
            route: this.props.route,
            locale: this.props.locale,
        };
        meanwhile.show(<SearchBarSync {...props} />, 1000);
        return db.start().then((userId) => {
            // load daily activities statistics
            var start = DateTracker.startOfLastMonth;
            var end = DateTracker.endOfMonth;
            var timeRanges = DateUtils.getMonthRanges(start, end);
            var tzOffset = DateUtils.getTimeZoneOffset();
            var stats = this.props.settings.statistics;
            var criteria = {
                type: stats.type,
                filters: _.map(timeRanges, (timeRange) => {
                    return _.extend({
                        time_range: timeRange,
                        tz_offset: tzOffset,
                    }, stats.filters);
                }),
            };
            return db.find({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return <SearchBarSync {...props} />;
        });
    },
});

var SearchBarSync = module.exports.Sync = React.createClass({
    displayName: 'SearchBar.Sync',
    propTypes: {
        settings: PropTypes.object.isRequired,
        dailyActivities: PropTypes.arrayOf(PropTypes.object),
        route: PropTypes.instanceOf(Route),
        locale: PropTypes.instanceOf(Locale),
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            tags: HTMLDivElement,
        });
        var route = this.props.route;
        var keywords = route.query.search || '';
        return {
            keywords: keywords,
            hashTags: [],
            selectedHashTags: findTags(keywords),
        };
    },

    /**
     * Update keywords if necessary
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
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
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="search-bar">
                {this.renderTextInput()}
                {this.renderHashTags()}
            </div>
        );
    },

    renderTextInput: function() {
        var t = this.props.locale.translate;
        var inputProps = {
            type: 'text',
            value: this.state.keywords,
            placeholder: t('search-bar-keywords'),
            onChange: this.handleTextChange,
            onKeyDown: this.handleKeyDown,
        };
        return (
            <div className="text-input">
                <input {...inputProps} />
            </div>
        );
    },

    /**
     * Render list of hash tags
     *
     * @return {ReactElement}
     */
    renderHashTags: function() {
        var setters = this.components.setters;
        return (
            <div ref={setters.tags} className="tags">
                {_.map(this.state.hashTags, this.renderHashTag)}
            </div>
        );
    },

    /**
     * Render a hash tag
     *
     * @param  {Object} tag
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderHashTag: function(tag, index) {
        var route = this.props.route;
        var params = _.clone(this.props.settings.route.parameters);
        params.search = tag.name;
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
    },

    /**
     * Attach handler for resize
     */
    componentDidMount: function() {
        window.addEventListener('resize', this.handleWindowResize);
    },

    /**
     * Adjust tags visibility based on popularity upon redraw
     */
    componentDidUpdate: function() {
        this.hideUnpopularTags();
    },

    /**
     * Remove resize handler
     */
    componentDidMount: function() {
        window.addEventListener('resize', this.handleWindowResize);
    },

    /**
     * Hide less popular tags until the remaining fit on one line
     */
    hideUnpopularTags: function() {
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
    },

    /**
     * Perform search by inserting search terms into URL
     */
    performSearch: function() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.search = normalize(this.state.keywords);
        route.push(route.component, params);
    },

    /**
     * Called when user changes search string
     *
     * @param  {Event} evt
     */
    handleTextChange: function(evt) {
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
    },

    /**
     * Called when user press a key
     *
     * @param  {Evt} evt
     */
    handleKeyDown: function(evt) {
        if (evt.keyCode === 13) {
            this.performSearch();
        }
    },

    /**
     * Called when user clicks on a tag
     *
     * @param  {Event} evt
     */
    handleHashTagClick: function(evt) {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    },

    /**
     * Called when user resizes the browser window
     *
     * @param  {Event} evt
     */
    handleWindowResize: function(evt) {
        this.hideUnpopularTags();
    },
});

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
    // merge stats from the months
    var details = _.transform(dailyActivities, (counts, da) => {
        _.assign(counts, da.details);
    }, {});
    // score the tags based on how often they are used
    var scores = {}, frequency = {};
    _.each(details, (activities, date) => {
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
