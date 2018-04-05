**Server type** - Windows Live

**Name** - There is no need to change this.

**Identifier** - There is no need to change this.

**New users** - Controls whether new Trambar accounts are created for users
authenticated through Windows Live. You can choose to make Windows users guests
at your site or make them regular users.

If you choose to not register new users, then only users you've manually created
can sign-in through Windows. You will need to know which e-mail address they've
used to sign up for Windows.

**Role assignment** - You can automatically assign roles to new users
authenticated through this server. This is useful for story filtering.

**Site URL** - The URL of the Trambar website. It's set in the Settings page.
It's used to form the redirect URL. 

**Redirect URL** - You will need this URL when you create an app at the
[Windows Live application management site](https://apps.dev.microsoft.com/).
First, press the *Add an app* button in the *Live SDK applications* section.
Enter a name (e.g. _Rick's Trambar_) and press *Create application*. In the
next page, scroll down to the *Platforms* section. The *Web* platform should
already be present. Click the *Add URL* button beside *Redirect URLs*, then
copy this URL into the box.

**Privacy policy URL** - Microsoft recommends that you provide a privacy policy
URL. You may link to your company's own policy page or use this boilerplate.

**Application ID** - Copy the application id from Windows Live. It can be found
just under the application name.

**Application secret** - Copy the application secret from Windows Live.

For the app icon, you may use your company's logo or choose Trambar's
[default icon](windows-icons.zip).
