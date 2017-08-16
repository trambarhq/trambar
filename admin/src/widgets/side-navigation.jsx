var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var NavigationTree = require('widgets/navigation-tree');

require('./side-navigation.scss');

module.exports = React.createClass({
    displayName: 'SideNavigation',
    propTypes: {
        disabled: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            disabled: false
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <nav className="side-navigation">
                {this.renderHeader()}
                {this.renderNavTree()}
            </nav>
        );
    },

    renderNavTree: function() {
        var navProps = {
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <NavigationTree {...navProps} />;
    },

    renderHeader: function() {
        return (
            <header onClick={this.handleHeaderClick}>
                {this.renderLogo()}
                {this.renderAppName()}
            </header>
        );
    },

    renderAppName: function() {
        var t = this.props.locale.translate;
        return (
            <h2>{t('app-name')}</h2>
        );
    },

    renderLogo: function() {
        return (
            <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="1000 1000 5080 6299" preserveAspectRatio="xMidYMid" style={{ strokeLinejoin: 'round', strokeWidth: 30 }}>
              <defs className="ClipPathGroup">
                <clipPath clipPathUnits="userSpaceOnUse">
                  <rect x="1000" y="1000" width="5080" height="6299"/>
                </clipPath>
              </defs>
              <defs className="TextShapeIndex"/>
              <defs className="EmbeddedBulletChars">
                  <path d="M0.3-0.6L0.6-0.3 0.3 0 0-0.3 0.3-0.6Z"/>
                  <path d="M0-0.6L0.6-0.6 0.6 0 0 0 0-0.6Z"/>
                  <path d="M0.1 0L0.3-0.4 0.1-0.7 0.7-0.4 0.1 0ZM1358 739L309 1346 659 739 1358 739Z"/>
                  <path d="M1-0.4L0.6 0 0.4 0 0.6-0.3 0.1-0.3 0.1-0.5 0.6-0.5 0.4-0.7 0.6-0.7 1-0.4Z"/>
                  <path d="M0 0C0 0 0 0 0 0L0.2-0.3C0.1-0.4 0.1-0.5 0.1-0.5 0.1-0.5 0.1-0.5 0.1-0.5 0.1-0.5 0.1-0.5 0.1-0.5 0.2-0.5 0.2-0.5 0.2-0.5L0.2-0.5 0.2-0.4 0.4-0.5 0.4-0.5 0.4-0.5C0.4-0.5 0.4-0.5 0.5-0.5 0.4-0.5 0.4-0.4 0.4-0.4 0.4-0.4 0.3-0.3 0.3-0.3L0.4-0.1C0.4-0.1 0.4-0.1 0.3-0.1L0.4-0.1C0.4 0 0.3 0 0.3 0 0.3 0 0.3-0.1 0.2-0.2L0.1 0C0.1 0.1 0.1 0.1 0 0.1 0 0.1 0 0.1 0 0 0 0 0 0 0 0 0 0 0 0 0 0Z"/>
                  <path d="M0.1 0C0.1 0 0.1 0 0-0.1 0-0.1 0-0.2 0-0.2 0-0.3 0-0.3 0-0.3 0.1-0.4 0.1-0.4 0.1-0.4 0.1-0.4 0.2-0.4 0.2-0.3L0.2-0.2C0.2-0.2 0.2-0.2 0.2-0.2L0.6-0.5C0.6-0.6 0.6-0.6 0.6-0.6 0.6-0.6 0.6-0.5 0.6-0.5L0.6-0.5C0.6-0.5 0.6-0.4 0.6-0.4L0.2 0C0.2 0 0.2 0 0.1 0Z"/>
                  <path d="M0.4 0C0.3 0 0.2 0 0.2-0.1 0.1-0.1 0.1-0.2 0.1-0.3 0.1-0.4 0.1-0.4 0.2-0.5 0.2-0.6 0.3-0.6 0.4-0.6 0.5-0.6 0.6-0.6 0.6-0.5 0.7-0.4 0.7-0.4 0.7-0.3 0.7-0.2 0.7-0.1 0.6-0.1 0.6 0 0.5 0 0.4 0Z"/>
                  <path d="M0.2-0.2C0.1-0.2 0.1-0.2 0.1-0.3 0-0.3 0-0.3 0-0.4 0-0.4 0-0.4 0.1-0.4 0.1-0.5 0.1-0.5 0.2-0.5 0.2-0.5 0.2-0.5 0.3-0.4 0.3-0.4 0.3-0.4 0.3-0.4 0.3-0.3 0.3-0.3 0.3-0.3 0.2-0.2 0.2-0.2 0.2-0.2Z"/>
                  <path d="M0-0.2L0.6-0.2 0.6-0.3 0-0.3 0-0.2Z"/>
              </defs>
              <defs className="TextEmbeddedBitmaps"/>
              <g className="SlideGroup">
                  <g className="Slide" clipPath="url(#presentation_clip_path)">
                    <g className="Page">
                      <g className="com.sun.star.drawing.ClosedBezierShape">
                          <rect className="BoundingBox" x="1000" y="1000" width="5082" height="6301" fill="none"/>
                          <path d="M1655 2259L5444 2259 6080 2890 6080 3520 5233 3520 5233 3099 1847 3099 1847 3918 1847 4758 1847 5619 1847 6459 5233 6459 5233 5619 4809 5619 4809 4989 6080 4989 6080 6669 5444 7299 1635 7299 1000 6669 1000 2890 1655 2259ZM3116 6459L3116 4569 3963 4569 3963 6459 3116 6459ZM3540 3520C3780 3520 3963 3701 3963 3939 3963 4178 3780 4360 3540 4360 3300 4360 3116 4178 3116 3939 3116 3701 3300 3520 3540 3520ZM3116 3520L3116 3520ZM3964 4361L3964 4361ZM3328 2259L3328 1419 2693 1419 2693 1000 4387 1000 4387 1419 3752 1419 3752 2259 3328 2259Z" fill="rgb(255,255,255)"/>
                      </g>
                    </g>
                  </g>
              </g>
            </svg>
        );
    },

    handleHeaderClick: function() {

    },
});
