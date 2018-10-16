import _ from 'lodash';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

import './new-items-alert.scss';

/**
 * Component that displays a pop-up message when necessary, alerting the user
 * to the fact that new contents has appeared at the top of the page that they
 * otherwise wouldn't notice due to scrolling. It doesn't render anything
 * itself, since the pop-up needs to be outside the parent component's HTML
 * node. Instead, it uses ReactDOM to render into a node that it'd create in
 * the viewport node.
 *
 * TODO: Take advantage of React 16's support for portals
 *
 * @extends PureComponent
 */
class NewItemsAlertProxy extends PureComponent {
    static displayName = 'NewItemsAlertProxy';

    /**
     * Do not render anything
     *
     * @return {null}
     */
    render() {
        return null;
    }

    /**
     * Draw the alert if component is show on mount
     */
    componentDidMount() {
        let { url } = this.props;
        if (url) {
            this.show(this.props);
        }
    }

    /**
     * Show or hide the actual element when props.show changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { url, children } = this.props;
        if (!url && nextProps.url) {
            this.show(nextProps);
        } else if (url && !nextProps.url) {
            this.hide(this.props);
        } else if (nextProps.children !== children || nextProps.url !== url) {
            if (nextProps.url) {
                this.redraw(nextProps, true);
            }
        }
    }

    /**
     * Remove the alert on unmount
     */
    componentWillUnmount() {
        this.hide(this.props);
    }

    /**
     * Render the actual component into the viewport element
     *
     * @param  {Object} props
     */
    show(props) {
        if (!this.containerNode) {
            this.containerNode = document.createElement('DIV');
            this.viewport = document.getElementsByClassName('page-view-port')[0];
            this.viewport.appendChild(this.containerNode);
        } else {
            if (this.containerRemovalTimeout) {
                clearTimeout(this.containerRemovalTimeout);
                this.containerRemovalTimeout = 0;
            }
        }
        this.redraw(props, false);
        setTimeout(() => {
            this.redraw(props, true);
        }, 10);
    }

    /**
     * Redraw the actual component
     *
     * @param  {Object} props
     * @param  {Boolean} show
     */
    redraw(props, show) {
        let { route } = this.props;
        ReactDOM.render(<NewItemsAlert {...props} show={show} />, this.containerNode);
    }

    /**
     * Remove the actual component from the viewport element
     *
     * @param  {Object} props
     */
    hide(props) {
        if (!this.containerNode) {
            return;
        }
        if (!this.containerRemovalTimeout) {
            this.containerRemovalTimeout = setTimeout(() => {
                ReactDOM.unmountComponentAtNode(this.containerNode);
                this.viewport.removeChild(this.containerNode);
                this.viewport = null;
                this.containerNode = null;
                this.containerRemovalTimeout = 0;
            }, 500);
        }
        this.redraw(props, false);
    }
}

function NewItemsAlert(props) {
    let { url } = props;
    let anchorProps = {
        className: `new-items-alert ${props.show ? 'show' : 'hide'}`,
        href: url,
        onClick: props.onClick,
    };
    return (
        <a {...anchorProps}>
            <i className="fa fa-arrow-up" />
            {props.children}
        </a>
    );
}

export {
    NewItemsAlertProxy as default,
    NewItemsAlertProxy,
    NewItemsAlert,
};

import Route from 'routing/route';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NewItemsAlertProxy.propTypes = {
        url: PropTypes.string,
        onClick: PropTypes.func,
    };
}
