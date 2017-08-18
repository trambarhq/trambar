var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// pages
var RepoListPage = require('pages/repo-list-page');
var RepoSummaryPage = require('pages/repo-summary-page');

// widgets
var Tooltip = require('widgets/tooltip');

require('./repository-tooltip.scss');

module.exports = RepositoryTooltip;

function RepositoryTooltip(props) {
    if (props.repos == null) {
        return null;
    }
    var t = props.locale.translate;
    var label = t('repository-toolip-$count', props.repos.length);
    var list = _.map(props.repos, (repo, i) => {
        var url = RepoSummaryPage.getUrl({
            projectId: props.project.id,
            repoId: repo.id,
        });
        var iconName;
        switch (repo.type) {
            case 'gitlab':
                iconName = repo.type;
                break;
        }
        console.log(repo)
        return (
            <div key={i}>
                <a href={url}>
                    <i className={`fa fa-${iconName}`}/>
                    {' '}
                    {repo.details.name}
                </a>
            </div>
        );
    });
    var listUrl = RepoListPage.getUrl({
        projectId: props.project.id,
    });
    return (
        <Tooltip className="repository">
            <inline>{label}</inline>
            <window>
                {list}
                <div className="bottom">
                    <a href={listUrl}>{t('tooltip-more')}</a>
                </div>
            </window>
        </Tooltip>
    );
}

RepositoryTooltip.propTypes = {
    repos: PropTypes.arrayOf(PropTypes.object),
    project: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale),
};
