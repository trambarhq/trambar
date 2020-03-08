import _ from 'lodash';

export class FocusManager {
  static entries = [];
  static requests = [];

  static register(component, props) {
    this.entries.unshift({ component, props });

    // see if a request for focus has been made
    _.remove(this.requests, (request) => {
      if (_.isMatch(props, request)) {
        component.focus();
        return true;
      }
    });
  }

  static unregister(component) {
    _.remove(this.entries, { component });
  }

  static focus(props) {
    const entry = _.find(this.entries, { props });
    if (entry) {
      entry.component.focus()
    } else {
      // store the request and set focus when component registers itself
      requests.push(props);
    }
  }
}
