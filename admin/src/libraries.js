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
  'mark-gor': async () => {
    await import('mark-gor');
  },
  'moment': async () => {
    await import('moment');
  },
  'moment-timezone': async () => {
    await import('moment-timezone');
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
