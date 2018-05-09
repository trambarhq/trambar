**Site name** - The name of the web site appears in the *Start* page.

**Company name** - The name of your company. It appears in the terms and conditions.

**Description** - The site description appears in the *Start* page. If it is
long, a scroll bar will appear.

**Address** - The address of the web site is used during OAuth authentication.
It is also used by GitLab event hooks and when mobile notifications are sent.
It may include a port number. For testing purpose, an internal IP address will
work, provided it is reachable by the GitLab server. HTTPS is needed for
production deployment: Notification does not work when a site is unsecured.

**Push relay** - A push relay is used to send push notifications to mobile
devices. There are currently two relays: one located in Virginia, United States
(_us-east-1.push.trambar.io_) and one located in Dublin, Ireland
(_eu-west-1.push.trambar.io_).

**Background image** - The background image spans the width of the browser in
the *Start* page. It should be relatively high-resolution. It will be scaled
down and compressed to a suitable file size.

**Input languages** - When you select more than one input languages, you will
be given the option to enter text such as the site description in different
languages.

Currently, only the Administrative Console supports multilingual input.
