import * as BootstrapLoader from 'utils/bootstrap-loader';
import libraries from 'libraries';

if (typeof(cordova) === 'object') {
    document.addEventListener('deviceready', initialize);
} else {
    window.addEventListener('load', initialize);
}

async function initialize(evt) {
    let appContainer = document.getElementById('app-container');
    if (!appContainer) {
        throw new Error('Unable to find app element in DOM');
    }

    // load application code and support libraries
    let importFuncs = {};
    for (let key in libraries) {
        importFuncs[key] = libraries[key];
    }
    importFuncs['app'] = () => import('application' /* webpackChunkName: "app" */);
    let modules = await BootstrapLoader.load(importFuncs, showProgress);
    let AppCore = modules['app'].AppCore;
    let Application = modules['app'].default;
    let React = modules['react'];
    let ReactDOM = modules['react-dom'];
    let appProps = await AppCore(Application.coreConfiguration);
    let appElement = React.createElement(Application, appProps);
    ReactDOM.render(appElement, appContainer);
    hideSplashScreen();
}

function hideSplashScreen() {
    let screen = document.getElementById('splash-screen');
    let style = document.getElementById('splash-screen-style');
    let splashScreen = navigator.splashscreen;
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
    if (splashScreen) {
        splashScreen.hide();
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

if (process.env.PLATFORM === 'cordova') {
    if (typeof(cordova) !== 'object') {
        window.cordova = { platformId: 'android' };
    }
}
