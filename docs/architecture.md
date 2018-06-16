System Architecture
-------------------

* [Trambar subsystems](#trambar-subsystems)
* [Backend details](#backend-details)
* [Frontend details](#frontend-details)
  * [Propagating changes](#propagating-changes)
  * [Asynchronous operations](#asynchronous-operations)

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

## Frontend details

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

* *RemoteDataSource* - Handles data retrieval from and storage to a database on
a remote server
* *LocaleManager* - Provides text used in the user interface in different
languages
* *ThemeManager* - Deals with visual aspects of the app
* *RouteManager* - Maps the current URL to a page component
* *PayloadManager* - Handles file uploads

Each of these components is paired with a proxy object:

* *RemoteDataSource* -> ***Database***
* *LocaleManager* -> ***Locale***
* *ThemeManager* -> ***Theme***
* *RouteManager* -> ***Route***
* *PayloadManager* -> ***Payloads***

These proxy objects are passed (as props) to nearly every single components in
Trambar. They expose methods that components can call to trigger desired
action (e.g. saving something to the database). They also act as signals that
changes have occurred and updates to the user interface are necessary.

## Propagating changes

The five aforementioned components all expect an `onChange` handler.
The handler is triggered in specific circumstances:

* *RemoteDataSource* - When it receives a change notification from the remote
server--or after it has performed a save operation
* *LocaleManager* - When the user changes the current language or region
* *ThemeManager* - When the user resizes the browser window or adjust the zoom
level (thereby changing the screen pixel density)
* *RouteManager* - When the user navigates to a different part of the app (by
clicking a hyperlink, for instance)
* *PayloadManager* - When progress has been made in uploading a file

In each case, *Application* responds by creating a new instance of the
component's proxy object. This behavior is tailored for the typical response of
React components' `shouldComponentUpdate` method. So called pure components
don't perform any work unless they receive new props. When a prop is an object,
only a shallow comparison is done usually. Creation of new proxy objects is
designed specifically to trip this detection mechanism.

## Asynchronous operations

Of the five key components described above, four are able to readily provide
new information. Once a route change has occurred, *RouteManager* knows what
the current route is. If a component needs the route parameters, it can get
them immediately (they're stored in the *Route* object). Likewise, once
*LocaleManager* has loaded a phrase dictionary, any component that needs a
particular phrase while rendering will receive it immediately through a
synchronous method.

*RemoteDataSource* is rather different as the operations it performs are
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
