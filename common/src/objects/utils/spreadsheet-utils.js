import _ from 'lodash';

function getSpreadsheetName(spreadsheet, env) {
  const { p } = env.locale;
  return spreadsheet?.details?.filename || spreadsheet?.name || '';
}

export {
  getSpreadsheetName,
};
