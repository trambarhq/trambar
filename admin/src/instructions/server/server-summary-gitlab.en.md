**Server type** - GitLab

**Name** - There is no need to change this unless you're integrating multiple GitLab servers.

**Identifier** - There is no need to change this unless you're integrating multiple GitLab servers.

**New users** - Controls how GitLab users are mapped to Trambar. The simplest configuration is make administrators administrators, regular users regular users, and external users guests on Trambar. Or you may choose to make all regular users at GitLab moderators, so they can remove undesirable posts created by others.

**Role assignment** - You can automatically assign roles to new users authenticated through this server. For instance, you may choose to assign a "Developer" role to all users coming from GitLab.

**Site URL** - The URL of the Trambar website. It's set in the Settings page. It's used to form the callback URL.

**Callback URI** - You will need this URL when you create an app in GitLab. First, log into GitLab as an administrator. Go to the *Applications* page in the admin area (the wrench icon). Press the *New Application* button. Enter a name for the application (e.g. _Rick's Trambar_). Then copy this URL into the box under *Redirect URI*. For *Scopes*, check *API* and *read_user*. You may optionally choose to treat Trambar as a trusted app. For testing purpose, you may want to leave this off initially. Press *Submit* to save your changes.

**GitLab URL** - The base URL of the GitLab server (e.g. https://gitlab.trambar.io).

Even if GitLab is running on the same computer as Trambar, this URL can never have localhost as the host name. From Trambar's perspective, localhost refers to the Docker container in which it runs. You must use the computer's IP address instead (which cannot be 127.0.0.1).

If the GitLab server is using SSL, be sure the URL's protocol is HTTPS. Trambar does not follow HTTP to HTTPS redirections.

**Application ID** - Copy the application ID from GitLab.

**Application secret** - Copy the application secret from GitLab. On occasions, when you reuse an app's credentials, GitLab will not honor them. If that happens, try destroying the app and recreating it.

**API access** - Trambar needs administrative access to GitLab in order to scan repository activity logs and create issues in GitLab's issue tracker. Once you have saved the data entered into this page, click the *Acquire API access* button (which should be automatically selected). If you're still logged in as an administrator in GitLab, you will be presented with the option to authorize Trambar. Press the *Authorize* button. A simple "OK" will appear when the process is successful.

Afterward, this item should read *Administrative access acquired*. You will now be able to attach a GitLab repository to a new Trambar project.
