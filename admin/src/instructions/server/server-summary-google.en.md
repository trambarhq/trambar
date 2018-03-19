**Server type** - GitHub

**Name** - There is no need to change this.

**Identifier** - There is no need to change this.

**New users** - Controls whether new Trambar accounts are created for users
authenticated through Google+. You can choose to make Google+ users guests at
your site or make them regular users.

If you choose to not register new users, then only users you've manually created
can sign-in through Google+. You will need to know which e-mail address they've
used to sign up for Google+.

**Role assignment** - You can automatically assign roles to new users
authenticated through this server. This is useful for story filtering.

**Redirect URI** - You will need this URL when you create a project in the
[Google Developer Console](https://console.developers.google.com/cloud-resource-manager).
First, press the *Create Project* button. Enter a project name (e.g. _Rick's
Trambar_). Press *Create*. The new project should appear in the subsequent page
(reload the page if it's not there). Click on the project name, then hit the
hamburger button. Under *APIs & Services* select *Credentials*. In the
*Create credentials* dropdown, select *OAuth client ID*. Google will complain
about the lack of a product name. Go to the *Configure consent screen* page.
Enter a name and press save. In the next screen, select Web application, then
copy and paste this URL into the box under *Authorized redirect URIs*.

Note: Google will not accept a non-public URL.

**Privacy policy URL** - Google requires a privacy policy URL. You may
link to your company's own policy page or use this boilerplate. It is entered
in *OAuth consent screen*.

**Client ID** - Copy the client ID from Google Developer Console.

**Client secret** - Copy the client secret from Google Developer Console.

For the app icon, you may point to your company's logo or supply the URL of one
of the following:

![Trambar icon](icon-64x64.png)
![Trambar icon](icon-64x64-blue.png)
![Trambar icon](icon-64x64-black.png)
