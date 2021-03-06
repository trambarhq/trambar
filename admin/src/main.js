import * as BootstrapLoader from 'utils/bootstrap-loader';
import libraries from 'libraries';

window.addEventListener('load', initialize);

async function initialize(evt) {
    let container = document.getElementById('react-container');

    // load front-end code and support libraries
    let importFuncs = {};
    for (let key in libraries) {
        importFuncs[key] = libraries[key];
    }
    importFuncs['front-end'] = () => import('front-end' /* webpackChunkName: "front-end" */);
    let modules = await BootstrapLoader.load(importFuncs, showProgress);
    let { FrontEndCore, FrontEnd } = modules['front-end'];
    let React = modules['react'];
    let ReactDOM = modules['react-dom'];
    let props = await FrontEndCore(FrontEnd.coreConfiguration);
    let element = React.createElement(FrontEnd, props);
    ReactDOM.render(element, container);
    hideSplashScreen();
}

function hideSplashScreen() {
    let screen = document.getElementById('splash-screen');
    let style = document.getElementById('splash-screen-style');
    if (screen) {
        screen.className = 'transition-out';
        setTimeout(() => {
            if (screen.parentNode) {
                screen.parentNode.removeChild(screen);
            }
            if (style && style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 1000);
    }
}

function showProgress(loaded, total) {
    let progressBar = document.getElementById('bootstrap-progress-bar');
    let progressBarFilled = document.getElementById('bootstrap-progress-bar-filled');

    if (progressBar && progressBarFilled) {
        if (loaded < total) {
            if (progressBar.className !== 'show') {
                progressBar.className = 'show';
            }
        } else {
            progressBar.className = '';
        }
        progressBarFilled.style.width = Math.round(loaded / total * 100) + '%';
    }
}
