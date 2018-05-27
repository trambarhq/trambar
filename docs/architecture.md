System Architecture
-------------------

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

The five aforementioned components all expect an ```onChange``` handler.
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
React components' ```shouldComponentUpdate``` method. So called pure components
don't perform any work unless they receive new props. When a prop is an object,
only a shallow comparison is done usually. Creation of new proxy objects is
designed specifically to trip this detection mechanism.

### Dealing with asynchronicity

Of the five key components described above, four are able to readily provide
new information. Once a route change has occurred, *RouteManager* knows what
the current route is. If a component needs the route parameters, it can get
them immediately (they're stored in the *Route* object). Likewise, once
*LocaleManager* has loaded a phrase dictionary, any component that needs a
particular phrase while rendering will receive it immediately, through a
synchronous method.
