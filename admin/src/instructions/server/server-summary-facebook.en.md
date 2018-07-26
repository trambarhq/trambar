**Server type** - Facebook

**Name** - There is no need to change this.

**Identifier** - There is no need to change this.

**New users** - Controls whether new Trambar accounts are created for users
authenticated through Facebook. You can choose to make Facebook users guests at
your site or make them regular users.

If you choose to not register new users, then only users you've manually created
can sign-in through Facebook. You will need to know which e-mail address they've
used to sign up for Facebook.

**Role assignment** - You can automatically assign roles to new users
authenticated through this server. This is useful for story filtering.

**Site URL** - You will need this URL when you create an app in the [Facebook
App Dashboard](https://developers.facebook.com/apps/). First, press
the *Add a new app* button. Enter a display name (e.g. _Rick's Trambar_) and
a contact e-mail address then press *Create App ID*. Add *Facebook Login* to
the app. Select *WWW* as the platform. Copy this URL into the box under
*Site URL* and press *Save*. Skip the remaining steps.

**Redirect URL** - In the left navigation bar, choose *Facebook Login*, then
*Settings*. Copy and paste this URL into the box labeled *Valid OAuth Redirect
URIs*.

**Deauthorize Callback URL** - Copy and paste this URL into the box labeled
*Deauthorize Callback URL*.

**Privacy policy URL** - Facebook requires a privacy policy URL. You may
link to your company's own page or use this boilerplate. It is entered
in *Settings* > *Basic*.

**Terms and conditions URL** - Facebook requires a terms and conditions URL.
You may link to your company's own page or use this boilerplate. It is entered
in *Settings* > *Basic*.

**App ID** - Copy the app id from Facebook App Dashboard. It can be found in
*Settings* > *Basic*.

**App secret** - Copy the app secret from Facebook App Dashboard. You will
need to first click the *Show* button.

After you've saved this server, click the *Test OAuth integration* button to
verify that the configuration is correct.

You will need to change the status of the app from _Development_ to _Production_
in the Facebook App Dashboard once you're ready to deploy your site. Prior
to doing so, you may want to entering additional information (app category and
country restriction). For the app icon, you may use your company's logo or
choose Trambar's [default icon](facebook-icons.zip).
