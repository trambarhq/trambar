var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var RepoSummaryPage = require('pages/repo-summary-page');

var Locale = require('locale/locale');
var Tooltip = require('widgets/tooltip');

module.exports = RepositoryTooltip;

function RepositoryTooltip(props) {
    if (props.repos == null) {
        return null;
    }
    var t = props.locale.translate;
    var label = t('repository-$count', props.repos.length);
    var contents = _.map(props.repos, (repo, index) => {
        var url = RepoSummaryPage.getUrl({
            projectId: props.project.id,
            repoId: props.repo.id,
        });
        var name = repo.details.name;
        var iconName;
        switch (repo.type) {
            case 'gitlab':
                iconName = repo.type;
                break;
        }
        return (
            <a href={url}>
                <i className={`fa fa-${iconName}`}/>
                {' '}
                {name}
            </a>
        );
    });
    return (
        <Tooltip>
            <inline>{label}</inline>
            <window>{contents}</window>
        </Tooltip>
    );
}

RepositoryTooltip.propTypes = {
    repos: PropTypes.arrayOf(PropTypes.object),
    project: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale),
};
