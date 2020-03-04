const libraries = {
  'chartist': async () => {
    await import('chartist');
  },
  'diff': async () => {
    await import('diff');
  },
  'hammerjs': async () => {
    await import('hammerjs');
  },
  'lodash': async () => {
    await import('lodash');
  },
  'mark-gor': async () => {
    await import('mark-gor');
  },
  'moment': async () => {
    await import('moment');
  },
  'octicons': async () => {
    await import('octicons');
  },
  'sockjs-client': async () => {
    await import('sockjs-client');
  },
  'react': async () => {
    await import('react');
    await import('react-dom');
  },
};

export {
  libraries as default
};
