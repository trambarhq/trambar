var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');

require('./repository-tooltip.scss');

module.exports = React.createClass({
    displayName: 'RepositoryTooltip',
    mixins: [ UpdateCheck ],
    propTypes: {
        repos: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object.isRequired,
        route: PropTypes.object.isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        disabled: PropTypes.bool,
    },

    render: function() {
        if (this.props.repos == null) {
            return null;
        }
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var route = this.props.route;
        var label = t('repository-tooltip-$count', this.props.repos.length);
        var list = _.map(this.props.repos, (repo, i) => {
            var url = route.find(require('pages/repo-summary-page'), {
                project: this.props.project.id,
                repo: repo.id,
            });
            var iconName = repo.type;
            var name = p(repo.details.title) || t(`server-type-${repo.type}`);
            return (
                <div className="item" key={i}>
                    <a href={url}>
                        <i className={`fa fa-${iconName}`}/>
                        {' '}
                        {name}
                    </a>
                </div>
            );
        });
        var listURL = route.find(require('pages/repo-list-page'), {
            project: this.props.project.id,
        });
        return (
            <Tooltip className="repository" disabled={this.props.disabled || list.length === 0}>
                <inline>{label}</inline>
                <window>
                    {list}
                    <div className="bottom">
                        <a href={listURL}>{t('tooltip-more')}</a>
                    </div>
                </window>
            </Tooltip>
        );
    }
});
