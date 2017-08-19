var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// pages
var ProjectListPage = require('pages/project-list-page');
var ProjectSummaryPage = require('pages/project-summary-page');

// widgets
var Tooltip = require('widgets/tooltip');

require('./project-tooltip.scss');

module.exports = ProjectTooltip;

function ProjectTooltip(props) {
    if (props.projects == null) {
        return null;
    }
    var t = props.locale.translate;
    var p = props.locale.pick;
    var label = t('project-tooltip-$count', props.projects.length);
    var projects = _.sortBy(props.projects, (project) => {
        return p(project.details.title) || project.name;
    });
    var ellipsis;
    if (projects.length > 10) {
        projects = _.slice(projects, 0, 10);
        ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
    }
    var list = _.map(props.projects, (project, i) => {
        var url = ProjectSummaryPage.getUrl({
            projectId: project.id,
        });
        var title = p(project.details.title) || project.name || '-';
        return (
            <div className="item" key={i}>
                <a href={url}>
                    {title}
                </a>
            </div>
        );
    });
    var listUrl = ProjectListPage.getUrl({
        projectId: props.project.id,
    });
    return (
        <Tooltip className="project">
            <inline>{label}</inline>
            <window>
                {list}
                {ellipsis}
                <div className="bottom">
                    <a href={listUrl}>{t('tooltip-more')}</a>
                </div>
            </window>
        </Tooltip>
    );
}

ProjectTooltip.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,
};
