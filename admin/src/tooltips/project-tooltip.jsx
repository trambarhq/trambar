var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');

require('./project-tooltip.scss');

module.exports = React.createClass({
    displayName: 'ProjectTooltip',
    mixins: [ UpdateCheck ],
    propTypes: {
        projects: PropTypes.arrayOf(PropTypes.object),
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        if (this.props.projects == null) {
            return null;
        }
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var route = this.props.route;
        var projects = this.props.projects;
        var first = '-';
        if (projects.length > 0) {
            // list the first project
            var project0 = projects[0]
            var url0;
            if (!this.props.disabled) {
                url0 = route.find('project-summary-page', {
                    project: project0.id,
                });
            }
            var title0 = p(project0.details.title) || project0.name;
            var first = <a href={url0} key={0}>{title0}</a>;
            projects = _.slice(projects, 1);
        }
        var contents;
        if (projects.length > 0) {
            var ellipsis;
            var label = t('project-tooltip-$count-others', projects.length);
            if (projects.length > 10) {
                projects = _.slice(projects, 0, 10);
                ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
            }
            var list = _.map(projects, (project, i) => {
                var url = route.find('project-summary-page', {
                    project: project.id,
                });
                var title = p(project.details.title) || project.name;
                return (
                    <div className="item" key={i}>
                        <a href={url}>
                            {title}
                        </a>
                    </div>
                );
            });
            var listURL = route.find('project-list-page', {});
            var tooltip = (
                <Tooltip className="project" disabled={this.props.disabled || list.length === 0} key={1}>
                    <inline>{label}</inline>
                    <window>
                        {list}
                        {ellipsis}
                        <div className="bottom">
                            <a href={listURL}>{t('tooltip-more')}</a>
                        </div>
                    </window>
                </Tooltip>
            );
            contents = t('tooltip-$first-and-$tooltip', first, tooltip);
        } else {
            contents = first;
        }
        return <span>{contents}</span>;
    }
});
