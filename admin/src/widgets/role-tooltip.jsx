var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');

require('./role-tooltip.scss');

module.exports = React.createClass({
    displayName: 'RoleTooltip',
    mixins: [ UpdateCheck ],
    propTypes: {
        roles: PropTypes.arrayOf(PropTypes.object),
        disabled: PropTypes.bool,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        if (this.props.roles == null) {
            return null;
        }
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var roles = this.props.roles;
        var first = '-';
        if (roles.length > 0) {
            // list the first role
            var role0 = roles[0]
            var url0;
            if (!this.props.disabled) {
                url0 = require('pages/role-summary-page').getUrl({
                   roleId: role0.id,
               });
            }
            var title0 = p(role0.details.title) || role0.name;
            var first = <a href={url0} key={0}>{title0}</a>;
            roles = _.slice(roles, 1);
        }
        var contents;
        if (roles.length > 0) {
            var ellipsis;
            var label = t('role-tooltip-$count-others', roles.length);
            if (roles.length > 10) {
                roles = _.slice(roles, 0, 10);
                ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
            }
            var list = _.map(roles, (role, i) => {
                var url = require('pages/role-summary-page').getUrl({
                    roleId: role.id,
                });
                var title = p(role.details.title) || role.name;
                return (
                    <div className="item" key={i}>
                        <a href={url}>
                            {title}
                        </a>
                    </div>
                );
            });
            var listUrl = require('pages/role-list-page').getUrl();
            var tooltip = (
                <Tooltip className="role" disabled={this.props.disabled} key={1}>
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
            contents = t('tooltip-$first-and-$tooltip', first, tooltip);
        } else {
            contents = first;
        }
        return <span>{contents}</span>;
    },
});
