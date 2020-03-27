import EventEmitter, { GenericEvent } from 'relaks-event-emitter';

class Notifier extends EventEmitter {
  constructor() {
    super();
    this.address = '';
    this.recentMessages = [];
  }

  saveMessage(msg) {
    this.recentMessages.unshift(msg);
    if (this.recentMessages.length > 10) {
       this.recentMessages.splice(10);
    }
  }

  /**
   * Parse and expand a notification
   *
   * @param  {Object} payload
   *
   * @return {Object|null}
   */
  unpack(payload) {
    if (payload.changes) {
      return {
        type: 'change',
        changes: this.unpackChanges(payload),
      };
    } else if (payload.alert) {
      return {
        type: 'alert',
        alert: this.unpackAlert(payload),
      };
    } else if (payload.revalidation) {
      return {
        type: 'revalidation',
        revalidation: this.unpackInvalidation(payload),
      };
    } else if (payload.socket) {
      return {
        type: 'connection',
        connection: this.unpackSocket(payload),
      };
    } else if (payload.schema && payload.notification_id) {
      return {
        type: 'alert',
        alert: this.unpackPushAlert(payload),
      };
    } else {
      return null;
    }
  }

  /**
   * Unpack a change notification to a list of changes
   *
   * @param  {Object} payload
   *
   * @return {Array<Object>}
   */
  unpackChanges(payload) {
    const list = [];
    const address = this.address;
    for (let [ key, info ] of Object.entries(payload.changes)) {
      const [ schema, table ] = key.split('.');
      for (let [ index, id ] of Object.entries(info.ids)) {
        const gn = info.gns[index];
        list.push({ address, schema, table, id, gn });
      }
    }
    return list;
  }

  /**
   * Attach base address to relative URLs in an alert
   *
   * @param  {Object} payload
   *
   * @return {Object}
   */
  unpackAlert(payload) {
    const alert = { ...payload.alert, address: this.address };
    if (alert.profile_image) {
      alert.profile_image = this.address + alert.profile_image;
    }
    if (alert.attached_image) {
      alert.attached_image = this.address + alert.attached_image;
    }
    return alert;
  }

  /**
   * Add address to a cache revalidation request
   *
   * @param  {Object} payload
   *
   * @return {Object}
   */
  unpackInvalidation(payload) {
    return { ...payload.revalidation, address: this.address };
  }

  /**
   * Create a connection object from socket id
   *
   * @param  {Object} payload
   *
   * @return {Object}
   */
  unpackSocket(payload) {
    return {
      method: 'websocket',
      relay: null,
      token: payload.socket,
      address: this.address,
      details: {
        user_agent: navigator.userAgent
      },
    };
  }

  /**
   * Extract information needed for handling a click on a mobile alert
   *
   * @param  {Object} payload
   *
   * @return {Object}
   */
  unpackPushAlert(payload) {
    return {
      title: '',
      message: '',
      type: payload.type,
      address: this.address,
      schema: payload.schema,
      notification_id: parseInt(payload.notification_id),
      reaction_id: parseInt(payload.reaction_id),
      story_id: parseInt(payload.story_id),
      user_id: parseInt(payload.user_id),
      foreground: !!payload.foreground,
    };
  }
}

class NotifierEvent extends GenericEvent {
}

export {
  Notifier as default,
  Notifier,
  NotifierEvent,
};
