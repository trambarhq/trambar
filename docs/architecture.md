System Architecture
-------------------

* [Trambar subsystems](#trambar-subsystems)
* [Backend details](#backend-details)
* [Frontend details](#frontend-details)

## Trambar subsystems

Trambar Server is composed of [Nginx](https://www.nginx.com/),
[PostgreSQL](https://www.postgresql.org/), and scripts running on
[Node.js](https://nodejs.org/en/).

Trambar Web Client is an HTML5 application based on the
[React](https://reactjs.org/) framework.

Trambar Mobile Client runs a variant of the Web Client on
[Cordova](https://cordova.apache.org/).

![diagram](img/architecture-basic-diagram.png)

## Backend details

* [Services](#services)
* [Data model](#data-model)
* [Data accessors](#data-accessors)
* [Change events](#change-events)

### Services

Trambar backend services are Node.js scripts, each running in a separate Docker container:

* **Data Server** - Handles data queries and storage requests. There're two
  instances of this: one handling requests from the Administrative Console,
  with elevated access level, and another hanlding requests from the Web
  Client.
* **Event Notifier** - Sends database change notifications and alert messages over
  Web Socket or mobile push services
  ([APNS](https://developer.apple.com/notifications/),
  [FCM](https://firebase.google.com/docs/cloud-messaging/),
  [WNS](https://docs.microsoft.com/en-us/windows/uwp/design/shell/tiles-and-notifications/windows-push-notification-services--wns--overview)).
* **GitLab Adapter** - Imports data from GitLab.
* **Live-Data Invalidator** - Monitors database for changes and flags affected
  statistics record and story listings as out-of-date.  
* **Live-Data Updater** - Update records that have been flagged as out-of-date.
* **Media Server** - Handles uploaded media files and perform any necessary
  conversion. It uses FFMPEG to transcode video files.
* **Schema Manager** - Creates new database schema when new projects are created. It has access to the PostgreSQL root account.
* **Session Manager** - Handles the authentication through OAuth and creation of sessions.

These scripts communicate with the outside world (where necessary) through
Nginx. They communicate with each other through PostgreSQL, utilizing its
[notification feature](https://www.postgresql.org/docs/9.3/static/libpq-notify.html).

### Data model

Trambar utilizes a denormalized "Less-SQL" data model. While tables are related
to each other, joins are generally not done on the server side. Linkage
between objects occurs in front-end code instead. Objects are basically
stored in the same form as they appear in the front-end. The model is designed
with client-side caching in mind. It also means very fast data retrieval.

Linking tables are not used for many-to-many relationships. These are
implemented instead as arrays of integer keys.

For the sake of flexibility, most contents are placed in a JSON column named
`details`. Things like names and descriptions are stored here. Media attached
to an object, such as a user's profile picture, are also stored here.

The integer column `gn` holds a generation number. It's incremented every time
a row changes (by a database trigger).

### Data accessors

A data accessor is simply a bundle of functions for working with data in a
particular table. The following are some keys functions:

* `create()` - Create the table and its indices
* `watch()` - Add triggers to the table
* `find()` - Find matching rows
* `insert()` - Insert new rows
* `update()` - Update existing rows
* `import()` - Accept remotely supplied data, apply access control (write),
error check, and other possible adjustments
* `export()` - Strip out data needed only by back-end code, apply access
control (read) and other possible adjustments
* `isRelevantTo` - Check if a change event involves an object that can be seen
by a given user

### Change events

A change events is broadcasted whenever a row is inserted, updated, or deleted.
It's a plain object containing the following properties:

* `op` - The operation performed ('INSERT', 'UPDATE', or 'DELETE')
* `table` - The table that was altered
* `schema` - The schema containing the said table
* `id` - The primary key of the row
* `gn` - The current generation number
* `diff` - An object containing the columns that were changed
* `current` - An object containing the current values of selected columns
* `previous` - An object containing the previous values of selected columns, if
they're different from the current values

Only the values of critical columns are included in the event object. The
columns are specified as parameters to the trigger function.

Trambar services that do not accept requests directly from the front-end code
are dependent on change events triggered by those that do. For example, when a
user publishes a new post, the client sends a storage request to **Data Server**.
**Live-Data Invalidator** then receives a notification about the operation on
the `story` table. It marks certain rows in the `statistics` and `listing`
table as "dirty", meaning not up-to-date. **Live-Data Updater** in turns
receives notifications about these changes and proceed to update the dirty rows.

## Frontend details

* [Basic structure](#basic-structure)
* [Propagating changes](#propagating-changes)
* [Asynchronous operations](#asynchronous-operations)
* [Data queries](#data-queries)

## Basic structure

Trambar Web Client is based on React. The React component tree is the app's
main structure. There's no other model or pattern. The intended approach is
[WYSIWYG](https://en.wikipedia.org/wiki/WYSIWYG). Using React's
[Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en) or
[Firefox browser extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/),
you can easily examine the running state of most parts of Trambar.

![React component tree](img/component-tree.png)

Non-visual parts of Trambar are implemented as React components. They sit at
the root level (highlighted above) and communicate with the *Application*
component through props changes and event handlers. *Application* also directly
invokes methods of these components when it want specific actions performed.

There are five key components:

* **RemoteDataSource** - Handles data retrieval from and storage to a database on
a remote server
* **LocaleManager** - Provides text used in the user interface in different
languages
* **ThemeManager** - Deals with visual aspects of the app
* **RouteManager** - Maps the current URL to a page component
* **PayloadManager** - Handles file uploads

Each of these components is paired with a proxy object:

* **RemoteDataSource** -> ***Database***
* **LocaleManager** -> ***Locale***
* **ThemeManager** -> ***Theme***
* **RouteManager** -> ***Route***
* **PayloadManager** -> ***Payloads***

These proxy objects are passed (as props) to nearly every single components in
Trambar. They expose methods that components can call to trigger desired
action (e.g. saving data to the database). They also act as signals that
changes have occurred and updates to the user interface are necessary.

## Propagating changes

The five aforementioned components all expect an `onChange` handler.
The handler is triggered in specific circumstances:

* **RemoteDataSource** - When it receives a change notification from the remote
server--or after it has performed a save operation
* **LocaleManager** - When the user changes the current language or region
* **ThemeManager** - When the user resizes the browser window or adjust the zoom
level (thereby changing the screen pixel density)
* **RouteManager** - When the user navigates to a different part of the app (by
clicking a hyperlink, for instance)
* **PayloadManager** - When progress has been made in uploading a file

In each case, *Application* responds by creating a new instance of the
component's proxy object. This behavior is tailored for the typical response of
React components' `shouldComponentUpdate` method. So called pure components
don't perform any work unless they receive new props. When a prop is an object,
only a shallow comparison is done usually. Creation of new proxy objects is
designed specifically to trip this detection mechanism.

## Asynchronous operations

Of the five key components described above, four are able to readily provide
new information. Once a route change has occurred, **RouteManager** knows what
the current route is. If a component needs the route parameters, it can get
them immediately (they're stored in the ***Route*** object). Likewise, once
**LocaleManager** has loaded a phrase dictionary, any component that needs a
particular phrase while rendering will receive it immediately through a
synchronous method.

**RemoteDataSource** is rather different as the operations it performs are
inherently asynchronous. It takes time to retrieve data from a database.
It takes time to transfer that data across the Internet. When a component asks
for data needed to render itself, it must wait for it to arrive.

Trambar deals with asynchronousity with the help of
[Relaks](https://github.com/chung-leong/relaks) a small library that allows a
React component to implement an asynchronous render method. In lieu of a
`ReactElement`, the method returns a [promise](https://promisesaplus.com/)
of a `ReactElement`.

Such a component is implemented as an asynchronous-synchronous pair. The
asynchronous half retrieves the necessary data then hands that data to its
synchronous half. A relatively simple example is *NotificationList*. It
accepts a list of notification objects and displays them:

![Notification list](img/client-notification-list.png)

![Notification list: React inspector](img/client-notification-list-react.png)

A notification object does not have all the necessary information. It lacks,
for instance, the name of the user who triggered the notification. It only has
the user ID. The user record must be retrieved so his name and profile picture
can be shown. This is done in *NotificationList*'s `renderAsync()` method:

```javascript
renderAsync: function(meanwhile) {
    var params = this.props.route.parameters;
    var db = this.props.database.use({ schema: params.schema, by: this });
    var props = {
        users: null,
        stories: null,

        currentUser: this.props.currentUser,
        notifications: this.props.notifications,
        database: this.props.database,
        route: this.props.route,
        locale: this.props.locale,
        theme: this.props.theme,
    };
    meanwhile.show(<NotificationListSync {...props} />);
    return db.start().then((userId) => {
        return UserFinder.findNotificationTriggerers(db, props.notifications).then((users) => {
            props.users = users;
        });
    }).then(() => {
        meanwhile.show(<NotificationListSync {...props} />);
        return StoryFinder.findStoriesOfNotifications(db, props.notifications, props.currentUser).then((stories) => {
            props.stories = stories;
        });
    }).then(() => {
        return <NotificationListSync {...props} />;
    })
},
```

*NotificationListSync* is a standard React component that draws the list's UI.
It accepts a superset of *NotificationList*'s props. In addition to a list of
notifications, it wants a list of users as well as the stories referenced by
the notification objects. These will be absent initially. The component makes
the best effort with what it's given. Without a name it cannot really formulate
a proper sentence. It can, however, render the frame so the user would see that
something is there.

The *StoryList* component works in the same way, only that its synchronous
companion requires many more related objects. In addition to the stories'
authors, it wants the reactions to the stories, as well as the users who
reacted. It also wants the bookmarks to the stories and their recipients. As
these objects are retrieved, `renderAsync()` calls `meanwhile.show()` to
rerender *StoryListSync* with new data added to the props. This progressive
rendering mechanism means the end user will see the story list immediately,
even through retrieval of all necessary data could take a few seconds.

### Data queries

Data queries occurs in two stages. In the discovery stage, client sends the
query and the server responds with a list of ids and generation numbers (gn) of
matching objects. In the retrieval stage, the client sends the ids of objects
that are out-of-date or absent from the local cache.
