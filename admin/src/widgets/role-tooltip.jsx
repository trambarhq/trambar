var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// pages
var RoleListPage = require('pages/role-list-page');
var RoleSummaryPage = require('pages/role-summary-page');

// widgets
var Tooltip = require('widgets/tooltip');

require('./role-tooltip.scss');

module.exports = RoleTooltip;

function RoleTooltip(props) {
    if (props.roles == null) {
        return null;
    }
    var t = props.locale.translate;
    var p = props.locale.pick;
    var label = t('role-tooltip-$count', props.roles.length);
    var roles = _.sortBy(props.roles, (role) => {
        return p(role.details.title) || role.name;
    });
    var ellipsis;
    if (roles.length > 10) {
        roles = _.slice(roles, 0, 10);
        ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
    }
    var list = _.map(props.roles, (role, i) => {
        var url = RoleSummaryPage.getUrl({
            roleId: role.id,
        });
        var title = p(role.details.title) || role.name || '-';
        return (
            <div className="item" key={i}>
                <a href={url}>
                    {title}
                </a>
            </div>
        );
    });
    var listUrl = RoleListPage.getUrl();
    return (
        <Tooltip className="role">
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

RoleTooltip.propTypes = {
    roles: PropTypes.arrayOf(PropTypes.object),
    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,
};
