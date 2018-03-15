**Server type** - Trambar can interface with a various OAuth providers.
Integration with GitLab is much deeper.

**Name** - You can choose a name for a server different from the default value,
in the event you wish to integrate multiple servers of the same type.

**Identifier** - The identifier is used in the OAuth callback URL. It must be
unique.

**New users** - Controls whether new Trambar accounts are created for user
authenticated through this server. You can choose to accept all users or only
accept users with matching accounts. The first option might be appropriate
for a GitLab server operated by your organization. The second option might be
appropriate for a third-party OAuth provider like Facebook.

**Role assignment** - You can automatically assign roles to new users
authenticated through this server. This is useful for story filtering.

**Callback URL** - This URL is used by an OAuth provider to redirect a user
back to your web site after he has been authenticated.

**Client ID** - An OAuth provider will assign a unique ID to identify this
application.

**Client secret** -An OAuth provider will supply a random text string used to
authenticate this application.

**API access** - Whether Trambar has gained access needed for deep integration.
Only applicable to GitLab currently.
