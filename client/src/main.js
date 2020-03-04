import { preload } from 'common/utils/bootstrap-loader.js';
import libraries from './libraries.js';

if (typeof(cordova) === 'object') {
  document.addEventListener('deviceready', initialize);
} else {
  window.addEventListener('load', initialize);
}

async function initialize(evt) {
  const loadFrontEnd = async () => {
    return import('./front-end.jsx' /* webpackChunkName: "front-end" */);
  };
  await preload({ ...libraries, loadFrontEnd }, showProgress);

  const React = await import('react');
  const ReactDOM = await import('react-dom');
  const { FrontEndCore, FrontEnd, coreConfiguration } = await loadFrontEnd();
  const props = await FrontEndCore(coreConfiguration);
  const element = React.createElement(FrontEnd, props);
  const container = document.getElementById('react-container');
  ReactDOM.render(element, container);
  hideSplashScreen();
}

function hideSplashScreen() {
  const screen = document.getElementById('splash-screen');
  const style = document.getElementById('splash-screen-style');
  const splashScreen = navigator.splashscreen;
  if (screen) {
    screen.className = 'transition-out';
    setTimeout(() => {
      screen.parentNode?.removeChild?.(screen);
      style?.parentNode?.removeChild?.(style);
    }, 1000);
  }
  if (splashScreen) {
    splashScreen.hide();
  }
}

function showProgress(loaded, total) {
  const progressBar = document.getElementById('bootstrap-progress-bar');
  const progressBarFilled = document.getElementById('bootstrap-progress-bar-filled');

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
