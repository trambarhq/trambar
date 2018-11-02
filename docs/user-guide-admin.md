Trambar User Guide - Administrative Console
-------------------------------------------

* [Sign in](#sign-in)
* [Projects](#projects)
* [Members](#members)
* [Repositories](#repositories)
* [Users](#users)
* [Roles](#roles)
* [Servers](#servers)
* [Settings](#settings)

## Sign in

* [Signing in using password](#signing-in-using-password)
* [Signing in using OAuth](#signing-in-using-oauth)
* [Signing off](#signing-off)

### Signing in using password

The first time you sign into the Administrative Console, you must use the root password provided during installation. Once Trambar is linked to a GitLab server, you can sign in using OAuth instead.

1. Enter user name and password.

2. Click the **Sign in** button.

   ![Sign in - password](img/admin-sign-in-password.png)

To reset the root password, run `sudo trambar password`.

### Signing in using OAuth

The option to sign in thru OAuth will become available once a GitLab server is added.

1. Click the **GitLab** button.

   ![Sign in - OAuth](img/admin-sign-in-oauth.png)

2. A GitLab pop-up window will appear. If you're not currently signed into GitLab, you'll be asked to provide your user credentials. Afterward, you'll be asked you to grant authorization to Trambar. Click the **Authorize** button.

   ![GitLab OAuth window](img/gitlab-oauth.png)

   The window may close itself immediately if Trambar is set as a trusted application and you're already signed in.

### Signing off

1. Click the user icon at the bottom of the left navigation, then **Sign off**.

   ![Sign off](img/admin-sign-off.png)

## Projects

* [Adding a new project](#adding-a-new-project)
* [Archiving old projects](#archiving-old-projects)
* [Deleting a project](#deleting-a-project)
* [Restoring archived or deleted projects](#restoring-archived-or-deleted-projects)

### Adding a new project

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the **Add new project** button.   

   ![Project list - add](img/admin-projects-add.png)

3. Enter the name and description of the project.

   ![Project form - name](img/admin-project-name.png)

   The project identifier will be derived automatically from the name, unless
   you're writing in a non-Latin script.

4. Choose a project emblem.

   ![Project form - emblem](img/admin-project-emblem.png)

5. Indicate how new members are added.

   ![Project form](img/admin-project-new-users.png)

   Generally it's easier to let users ask for membership. You can always reject those you wish to keep out.

   Automatically granting membership to regular users is sensible when your organization is small and you can trust everyone. It spares the administrator the task of approving each new member.

   Automatically granting membership to guests is sensible only when guest access is tightly controlled--for instance, when only GitLab external users can become guests.

6. Indicate whether non-members may view the project's news feed.

   ![Project form](img/admin-project-access.png)

7. Click the **Save project** button.

   ![Project form - save](img/admin-project-save.png)

### Archiving old projects

Archiving a project makes it read-only. People will no longer be able to publish posts to its news feed. It will also disappear from the [Start](user-guide.md#start---web-browser) page. An archived project can be reactivated later on.

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the **Edit project list** button.

   ![Project list - edit](img/admin-projects-edit.png)

3. The list will expand to show all projects, including those archived or deleted earlier. Click the name of each project that you wish to archive.

   ![Project list - select](img/admin-projects-archive-select.png)

4. Click the **Save project list** button.   

   ![Project list - archive](img/admin-projects-archive-save.png)

### Deleting a project

Deleting a project destroys its records permanently. Typically, you would only do this after making a mistake shortly after the project's creation.

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project you wish to delete.

   ![Project list](img/admin-projects-choose.png)

3. Click the arrow beside the gray button, then **Delete project**.

   ![Project summary - delete](img/admin-project-delete.png)

If you've deleted a project by mistake, use the browser's back button to return to the page and click the **Restore project** button.

### Restoring archived or deleted projects

You can easily put a project back into an active state. Deleted projects can also be restored, provided its records have not yet been garbage-collected.

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the **Edit project list** button.

   ![Project list - edit](img/admin-projects-edit.png)

3. The list will expand to show all projects, including those archived or deleted earlier. Click the name of each project that you wish to restore.

   ![Project list - select](img/admin-projects-restore-select.png)

4. Click the **Save project list** button.   

   ![Project list - archive](img/admin-projects-restore-save.png)

## Members

* [Approving membership requests](#approving-membership-requests)
* [Rejecting membership requests](#rejecting-membership-requests)
* [Adding existing users as members](#adding-existing-users-as-members)
* [Adding a new member manually](#adding-a-new-member-manually)
* [Removing members](#removing-members)

### Approving membership requests

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. If there are unapproved requests, certain users will appear grayed out in the list. Click the **Approve all requests** button to bring these pending members into the project.

   ![Member list - approve](img/admin-members-approve.png)

If you wish to add only some of the users, follow the [instructions for adding users](#adding-existing-users-as-members) instead.

### Rejecting membership requests

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. If there are unapproved requests, certain users will appear grayed out in the list. Click the arrow beside the **Approve all requests** button, then click **Reject all requests**.

   ![Member list - reject](img/admin-members-reject.png)

### Adding existing users as members

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. Click the **Edit member list** button.

   ![Member list - edit](img/admin-members-edit.png)

5. The list will expand to show all users. Click the name of each user that you wish to add.

   ![Member list -select](img/admin-members-add-select.png)

6. Click the **Save member list** button.   

   ![Member list - add](img/admin-members-add-save.png)

### Adding a new member manually

In order to add a user, you must know the e-mail address he had used to register at an OAuth provider.

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. Click the arrow beside the gray button, then **Add new user**.

   ![Member list - new](img/admin-members-new.png)

5. Enter the new member's personal information. Select a profile image. Choose the user type and role.

   ![Member form](img/admin-member-form.png)

6. Click the **Save member** button.

   ![Member form - save](img/admin-member-save.png)

### Removing members

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. Click the **Edit member list** button.

   ![Member list - edit](img/admin-members-edit.png)

5. The list will expand to show all users. Current members will be highlighted. Click the name of each member that you wish to remove.

   ![Member list -select](img/admin-members-remove-select.png)

6. Click the **Save member list** button.   

   ![Member list - add](img/admin-members-remove-save.png)

## Repositories

* [Adding repositories to a project](#adding-repositories-to-a-project)
* [Removing repositories](#removing-repositories)

### Adding repositories to a project

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Repositories** in the left navigation pane.

   ![Navigation - Repositories](img/admin-project-nav-repos.png)

4. Click the **Edit repository list** button.

   ![Repo list - edit](img/admin-repos-edit.png)

5. The list will expand to show all repositories. Click the name of each repo you wish to associate with the project.

   ![Repo list - select](img/admin-repos-add-select.png)

6. Click the **Save repository list** button.   

   ![Repo list - save](img/admin-repos-add-save.png)

### Removing repositories

Removing a repo from a project does not remove stories from that repo. If you've accidentally added the wrong repo, your project is fubar. A mean to rectify such a situation will be implemented in the future.

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Repositories** in the left navigation pane.

   ![Navigation - Repositories](img/admin-project-nav-repos.png)

4. Click the **Edit repository list** button.

   ![Repo list - add](img/admin-repos-edit-2.png)

5. The list will expand to show all repositories. Click the name of each repo you wish to remove.

   ![Repo list - select](img/admin-repos-remove-select.png)

6. Click the **Save repository list** button.   

   ![Repo list - save](img/admin-repos-remove-save.png)

## Users

* [Adding a new user manually](#adding-a-new-user-manually)
* [Deactivating users](#deactivating-users)
* [Deleting a user](#deleting-a-user)
* [Restoring deactivated or deleted users](#restoring-deactivated-or-deleted-users)

### Adding a new user manually

In order to add a user, you must know the e-mail address he had used to register at an OAuth provider.

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

2. Click the **Add new user** button.   

   ![User list - add](img/admin-users-add.png)

3. Enter the new user's personal information. Select a profile image. Choose the user type and role.

   ![User form](img/admin-user-form.png)

4. Click the **Save user** button.

   ![User form - save](img/admin-user-save.png)

### Deactivating users

Deactivating a user keeps him from signing into Trambar again. Posts and comments he has written will remain.

1. Click **Users** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-users.png)

2. Click the **Edit user list** button.

   ![User list - edit](img/admin-users-edit.png)

3. The list will expand to show all users, including those deactivated or deleted earlier. Click the name of each user you wish to deactivate.

   ![User list - select](img/admin-users-disable-select.png)

4. Click the **Save user list** button.

   ![User list - save](img/admin-users-disable-save.png)

### Deleting a user

Deleting a user removes him from the system completely. Posts and comments written by him will be deleted as well.

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

2. Click the name of the user you wish to delete.

   ![User list](img/admin-users-choose.png)

3. Click the arrow beside the gray button, then **Delete user account**.

   ![User summary - delete](img/admin-user-delete.png)

If you've deleted a user by mistake, use the browser's back button to return to the page and click the **Restore user** button.

### Restoring deactivated or deleted users

Deactivated user accounts can be made active again. Deleted users can also be restored, provided his records have not been garbage-collected yet.

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

2. Click the **Edit user list** button.

   ![User list - edit](img/admin-users-edit-2.png)

3. The list will expand to show all users, including those who were deactivated or deleted earlier. Click the name of each user you wish to restore.

   ![User list - select](img/admin-users-restore-select.png)

4. Click the **Save user list** button.

   ![User list - save](img/admin-users-restore-save.png)

## Roles

* [Adding a new role](#adding-a-new-role)
* [Assigning a role to users](#assigning-a-role-to-users)
* [Assigning a role automatically to new users](#assigning-a-role-automatically-to-new-users)
* [Removing users from a role](#removing-users-from-a-role)
* [Deactivating roles](#deactivating-roles)
* [Deleting a role](#deleting-a-role)
* [Restoring deactivated or deleted roles](#restoring-deactivated-or-deleted-roles)

### Adding a new role

1. Click **Roles** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the **Add new role** button.   

   ![Roles - add](img/admin-roles-new.png)

3. Enter the name and description of the role.

   ![Role form - name](img/admin-role-name.png)

4. Select a story priority.

   ![Role form - name](img/admin-role-priority.png)

   Story priority comes into play when a user has many (100+) unread stories and Trambar must decide which to present and which to omit. Typically, you would want to suppress posts by those whose role in the project is somewhat tangential.

5. Choose the users to whom you wish to assign the new role.

   ![Role form - users](img/admin-role-users.png)

6. Click the **Save role** button.

   ![Role form - save](img/admin-role-save.png)

### Assigning a role to users

1. Click **Roles** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the name of the role you wish to assign.

   ![Role list](img/admin-roles-choose.png)

3. Click the **Edit role** button.

   ![Role summary - edit](img/admin-role-edit.png)

4. Under **Users**, click the name of each user to whom you wish to assign the role.

   ![Role form - users](img/admin-role-users.png)

5. Click the **Save role** button.

   ![Role form - save](img/admin-role-save-2.png)

### Assigning a role automatically to new users   

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the name of the server whose users should be assigned the role.

   ![Server lists](img/admin-servers-choose.png)

3. Click the **Edit server** button.

   ![Server summary - edit](img/admin-server-edit.png)

4. Under **Role assignments**, click the role that will be assigned to new users from the server.

   ![Server form - roles](img/admin-server-role.png)

5. Click the **Save server** button.

   ![Server form -save](img/admin-server-gitlab-save.png)

### Removing users from a role

1. Click **Roles** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the name of the role from which you wish to remove users.

   ![Role list](img/admin-roles-choose.png)

3. Click the **Edit role** button.

   ![Role summary - edit](img/admin-role-edit.png)

4. Under **Users**, click the name of each user you wish to remove from the role.

   ![Role form - users](img/admin-role-users-2.png)

5. Click the **Save role** button.

   ![Role form - save](img/admin-role-save-2.png)

### Deactivating roles

1. Click **Roles** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the **Edit role list** button.

   ![Role list - edit](img/admin-roles-edit.png)

3. The list will expand to show all roles, including those disabled or deleted earlier. Click the name of each role you wish to disable.

   ![Role list - select](img/admin-roles-disable-select.png)

4. Click the **Save role list** button.

   ![Role list - save](img/admin-roles-disable-save.png)

### Deleting a role

1. Click **Roles** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the name of the role you wish to delete.

   ![Role list](img/admin-roles-choose.png)

3. Click the arrow beside the gray button, then **Delete role**.

   ![Role summary - delete](img/admin-role-delete.png)

If you've deleted a role by mistake, use the browser's back button to return to the page and click the **Restore role** button.

### Restoring deactivated or deleted roles

1. Click **Roles** in the left navigation pane.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the **Edit role list** button.

   ![Role list - edit](img/admin-roles-edit.png)

3. The list will expand to show all roles, including those who were deactivate or deleted earlier. Click the name of each role you wish to restore.

   ![Role list - select](img/admin-roles-restore-select.png)

4. Click the **Save role list** button.

   ![Role list - save](img/admin-roles-restore-save.png)

## Servers

* [Adding a GitLab server](#adding-a-gitlab-server)
* [Adding Dropbox](#adding-dropbox)
* [Adding Facebook](#adding-facebook)
* [Adding GitHub](#adding-github)
* [Adding Google+](#adding-google)
* [Adding Windows Live](#adding-windows-live)
* [Deactivating servers](#deactivating-servers)
* [Deleting a server](#deleting-a-server)
* [Restoring deactivated or deleted servers](#restoring-deactivated-or-deleted-servers)

### Adding a GitLab server

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *GitLab*.

   ![Server type](img/admin-server-gitlab-type.png)

4. In a different browser window, sign into GitLab using an account with administrative privilege.

5. Navigate to the **Admin area**.

   ![GitLab start page](img/gitlab-home.png)

6. Click **Applications** in the left navigation pane.

   ![GitLab - admin area](img/gitlab-admin-area.png)

7. Click the **New application** button.

   ![GitLab - applications](img/gitlab-applications.png)

8. Enter *Trambar* as the application's name, then copy the **Redirect URI** from Trambar Administrative Console into the corresponding box here. Select **api** and **read_user** as the application's scope, the click the **Submit** button.

   ![Server form - Gitlab URL](img/admin-server-gitlab-callback.png)

   ![GitLab - new application](img/gitlab-application.png)

9. Copy the **Application id** and **Application secret** from GitLab into the corresponding box in Trambar Administrative Console.

   ![GitLab - new application](img/gitlab-application-summary.png)

   ![Server form - id & secret](img/admin-server-gitlab-secrets.png)

10. Copy the URL of the GitLab server into the corresponding box in Trambar Adminstrative Console.

    ![Server form - Gitlab URL](img/admin-server-gitlab-url.png)

    The URL should contains only the domain name (and possibly a port number).

11. Indicate how you wish to map users from GitLab to Trambar.

    ![Server form - user mapping](img/admin-server-gitlab-new-users.png)

    A typical setup is to map GitLab administrator to Trambar administrator, GitLab regular user to Trambar regular user, and GitLab external user to Trambar guest. Users can be promoted to more privileged user type on a case by case basis.

12. Click the **Save server** button.

    ![Server form - save](img/admin-server-gitlab-save.png)

13. Click the **Acquire API access** button.

    ![Acquire API access](img/admin-server-acquire.png)

14. A GitLab pop-up window will appear. Click the **Authorize** button, then close the window when it says *OK*.

    ![GitLab OAuth window](img/gitlab-oauth.png)

If you're using a local instance of GitLab 11, be sure the server permits outbound requests to the local network. Otherwise Trambar will not be able to install project hooks (for monitoring events). You'll find the checkbox in **Admin Area** > **Settings** > **Outbound requests**.

### Adding Dropbox

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *Dropbox*.

   ![Server type](img/admin-server-dropbox-type.png)

4. In a different browser window, sign into [Dropbox App Console](https://www.dropbox.com/developers/apps).

5. Click the **Create app** button.

   ![Dropbox App list - add](img/dropbox-apps-add.png)

6. Select **Dropbox API**.

   ![Dropbox App - API](img/dropbox-app-api.png)

7. Select **App Folder** as the access level.

   ![Dropbox App - folder access](img/dropbox-app-folder-access.png)

   Trambar won't actually write anything to the folder. OAuth is used for authentication only.

8. Enter an application name. The name should contain the name of your company so that users will be able to correctly identify your app in Dropbox.

   ![Dropbox App - name](img/dropbox-app-name.png)

9. Click the **Create app** button.

   ![Dropbox App - create](img/dropbox-app-create.png)

10. Copy and paste the **Redirect URI** then click the **Add** button.

   ![Server form - redirect URI](img/admin-server-dropbox-callback.png)

   ![Dropbox App - redirect URI](img/dropbox-app-redirect-uri.png)

11. Copy and paste the **App key** and **App secret** into Trambar
    Administrative Console.

    ![Dropbox App - secrets](img/dropbox-app-secrets.png)

    ![Server form - secrets](img/admin-server-dropbox-secrets.png)

12. Under **New users** select a user type for users coming from GitHub.

    ![Server form - new users](img/admin-server-new-users.png)

13. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

14. Click the **Save server** button.

    ![Server form - save](img/admin-server-dropbox-save.png)

15. Click the **Test OAuth integration** button. A Dropbox pop-up window will appear. Grant authorization when prompted. Afterward, the page should simply read "OK".

   ![Server form - test](img/admin-server-dropbox-test.png)

16. Return to the Dropbox App Console. Click the **Apply for production** button to make the app publicly available.

   ![Dropbox App - apply](img/dropbox-app-apply.png)

### Adding Facebook

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *Facebook*.

   ![Server type](img/admin-server-facebook-type.png)

4. In a different browser window, sign into [Facebook App Dashboard](https://developers.facebook.com/apps/).

5. Click the **Add a New App** button.

   ![Facebook App Dashboard - add](img/facebook-apps-add.png)

6. Enter a display name and a contact e-mail address. The display name should contain the name of your company so that users will be able to correctly identify your app.

   ![Facebook App - create](img/facebook-app-dialog.png)

7. Click the **Create App ID** button

   ![Facebook App - create](img/facebook-app-dialog-create.png)

8. In the box label **Facebook Login**, click the **Set up** button.

   ![Facebook Login - start](img/facebook-app-login-setup.png)

9. Select **WWW** as the platform.

   ![Facebook Login - platform](img/facebook-app-platform-www.png)

10. Copy and paste the **Site URL**.

   ![Server form - site url](img/admin-server-site-url.png)

   ![Facebook Login - site url](img/facebook-app-site-url.png)

11. Click the **Save button**.

    ![Facebook Login - site url](img/facebook-app-site-url-save.png)

12. Click **Settings** under **Facebook Login** in the left navigation pane.

    ![Facebook Login - settings](img/facebook-app-site-url-nav-settings.png)

13. Copy and paste the **Redirect URI**.

    ![Server form - redirect URI](img/admin-server-facebook-callback.png)

    ![Facebook Login - redirect URI](img/facebook-app-redirect-uri.png)

14. Copy and paste the **Deauthorize Callback URL**.

    ![Server form - deauthorize URL](img/admin-server-facebook-deauthorize-url.png)

    ![Facebook Login - deauthorize URL](img/facebook-app-deauthorize-url.png)

15. Click the **Save Changes** button at the bottom of the page.

    ![Facebook Login - save](img/facebook-app-save.png)

16. Click **Basic** under **Settings** in the left navigation pane.

    ![Facebook Login](img/facebook-app-login-nav-basic.png)

17. Copy and paste the URLs for **Privacy policy** and **Terms** (or supply your own).

    ![Server form - terms](img/admin-server-facebook-terms.png)

    ![Facebook App - terms](img/facebook-app-terms.png)

18. Download the default icon from Trambar Adminstrative Console.

    ![Server form - default icon](img/admin-server-facebook-icons.png)

    Click **App icon** and upload the image file.

    ![Facebook App - icon](img/facebook-app-icon.png)

19. Choose *Utility & Productivity* as the app category.

    ![Facebook App - category](img/facebook-app-category.png)

20. Click the **Save Changes** button at the bottom of the page.

    ![Facebook Login - save](img/facebook-app-save.png)

21. Copy and paste **App ID** into Trambar Administrative Console.

    ![Facebook App - id](img/facebook-app-id.png)

    ![Server form - app id](img/admin-server-facebook-app-id.png)

22. Click the **Show** button in the **App Secret** text box. Copy and paste the secret token into Trambar Administrative Console.

    ![Facebook App - secret](img/facebook-app-secret.png)

    ![Server form - app secret](img/admin-server-facebook-app-secret.png)

23. Under **New users** select a user type for users coming from Facebook.

    ![Server form - new users](img/admin-server-new-users.png)

24. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

25. Click the **Save server** button.

    ![Server form - save](img/admin-server-facebook-save.png)

26. Click the **Test OAuth integration** button. A Facebook pop-up window will appear. Grant authorization when prompted. Afterward, the page should simply read "OK".

    ![Server form - test](img/admin-server-facebook-test.png)

27. Return to the Facebook App Dashboard. Click the **OFF** switch and confirm that you wish to make the app public.

    ![Facebook App - off](img/facebook-app-off.png)

### Adding GitHub

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *GitHub*.

   ![Server type](img/admin-server-github-type.png)

4. In a different browser window, navigate to the [GitHub Developer Settings](https://github.com/settings/developers) page.

5. Click the **New OAuth App** button.

   ![GitHub App list - add](img/github-apps-add.png)

6. Enter an application name. The name should contain the name of your company so that users will be able to correctly identify your app in GitHub.

   ![GitHub App - name](img/github-app-name.png)

7. Copy the **Site URL** from Trambar Administrative Console and use it as the app's **Homepage URL**.

   ![Server form - site URL](img/admin-server-site-url.png)

   ![GitHub App - homepage](img/github-app-homepage.png)

8. Copy and paste the **Callback URL**.

   ![Server form - callback URL](img/admin-server-github-callback.png)

   ![GitHub App - callback](img/github-app-callback.png)

9. Click the **Register Application** button.

   ![GitHub App - register](img/github-app-register.png)

10. Download the default app icon from Trambar Administrative Console.

   ![Server form - icon](img/admin-server-github-icons.png)

   Click the **Upload new logo** under **Application logo** and upload the image file.

   ![GitHub App - icon](img/github-app-icon.png)

11. Set the **Badge color** to `#f29d25`.

   ![GitHub App - badge color](img/github-app-badge-color.png)

12. Click the **Update application** button.

   ![GitHub App - update](img/github-app-update.png)

13. Copy and paste the **Client ID** and **Client secret** into Trambar Administrative Console.

    ![GitHub App - secrets](img/github-app-client-secrets.png)

    ![Server form - secrets](img/admin-server-github-secrets.png)

14. Under **New users** select a user type for users coming from GitHub.

    ![Server form - new users](img/admin-server-new-users.png)

15. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

16. Click the **Save server** button.

    ![Server form - save](img/admin-server-github-save.png)

17. Click the **Test OAuth integration** button. A GitHub pop-up window will appear. Grant authorization when prompted. Afterward, the page should simply read "OK".

    ![Server form - test](img/admin-server-github-test.png)

### Adding Google+

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *Google*.

   ![Server type](img/admin-server-google-type.png)

4. In a different browser window, sign into [Google Developer Console](https://console.developers.google.com/cloud-resource-manager).

5. Click the **Create Project** button.

   ![Google app list - new](img/google-apps-add.png)

6. Enter a **Project name**.

   ![Google app - name](img/google-app-project.png)

7. Click the **Create** button.

   ![Google app - create](img/google-app-create.png)      

8. Switch to the newly created project if it's not currently selected using the drop-down list at the top of the page.

   ![Google app - switch](img/google-app-switch.png)

9. Click the **Enable APIs and Services** button.

   ![Google app - enable APIs](img/google-app-enable-apis.png)

10. Look for "Google+" and click the button.

   ![Google app - Google+](img/google-app-plus-api.png)

11. Click the **Enable** button.

   ![Google app - Google+ enable](img/google-app-plus-app-enable.png)

12. Click the "hamburger" button.

   ![Google app - menu](img/google-app-menu.png)

13. Under **APIs & Services**, click **Credentials**.

    ![Google app - credentials](img/google-app-credentials.png)

14. Click the **Create credentials** button, then **OAuth client ID**.

    ![Google app - OAuth client](img/google-app-oauth-client.png)

15. Click the **Configure consent screen** button.

    ![Google app - app type](img/google-app-client-app-type-consent.png)

16. Enter an product name. The name should contain the name of your company so that users will be able to correctly identify your app in Google.

17. Copy the **Site URL** from Trambar Administrative Console and use it as the
    **Homepage URL**.

    ![Server form - site URL](img/admin-server-site-url.png)

    ![Google app - homepage](img/google-app-homepage.png)

18. Copy the address of one of the default app icons and paste it into the box labeled **Product logo URL**.

    ![Server form - icons](img/admin-server-google-icons.png)

    ![Google app - icon](img/google-app-icon.png)

19. Copy and paste the **Privacy policy** and **Terms**.

    ![Server form - terms](img/admin-server-google-terms.png)

    ![Google app - terms](img/google-app-terms.png)

20. Click the **Save** button.

    ![Google app - save](img/google-app-consent-save.png)

21. Select *Web application* as the **Application Type**.

    ![Google app - client type](img/google-app-client-type.png)

22. Copy and paste the **Redirect URI**.

    ![Server form - redirect URI](img/admin-server-google-callback.png)

    ![Google app - redirect URI](img/google-app-redirect-uri.png)

23. Click the **Create** button.

    ![Google app - create](img/google-app-client-create.png)

24. Copy and paste the **client ID** and **Client secret** into Trambar Administrative Console.

    ![Google app - secrets](img/google-app-client-secrets.png)

    ![Server form - secrets](img/admin-server-google-secrets.png)

25. Under **New users** select a user type for users coming from Google.

    ![Server form - new users](img/admin-server-new-users.png)

26. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

27. Click the **Save server** button.

    ![Server form - save](img/admin-server-google-save.png)

28. Click the **Test OAuth integration** button. A Google pop-up window will appear. Grant authorization when prompted. Afterward, the page should simply read "OK".

    ![Server form - test](img/admin-server-google-test.png)

### Adding Windows Live

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *Windows Live*.

   ![Server form - type](img/admin-server-windows-type.png)

4. In a different browser window, sign into to [Windows Live Application Management](https://apps.dev.microsoft.com/).

5. In the **Live SDK Application** section, click **Add an app**.

   ![Windows apps - add](img/windows-apps-add.png)

6. Enter an application name. The name should contain the name of your company so that users will be able to correctly identify your app in Windows.

   ![Windows app - name](img/windows-app-name.png)

7. Click the **Create application** button.

   ![Windows app - create](img/windows-app-create.png)

8. In the **Platforms** > **Web** section, click the **Add URL** button. Copy and paste the **Redirect URL** from Trambar Administrative Console.

   ![Server form - redirect URL](img/admin-server-windows-callback.png)

   ![Windows app - redirect URL](img/windows-app-redirect-url.png)

9. Download the default app icon from Trambar Administrative Console.

   ![Server form - icon](img/admin-server-windows-icons.png)

   Click the **Add** button under **Profile** > **Logo** and upload the image file.

   ![Windows app - icon](img/windows-app-icon.png)

10. Copy and paste the URL for **Privacy policy** and **Terms**.

   ![Server form - terms](img/admin-server-windows-terms.png)

   ![Windows app - terms](img/windows-app-terms.png)

11. Click the **Save** button at the bottom of the page.

12. Copy and paste the **Application ID** and **Application secret** into Trambar Administrative Console.

    ![Windows app - secrets](img/windows-app-secrets.png)

    ![Server form - secrets](img/admin-server-windows-secrets.png)

13. Under **New users** select a user type for users coming from Windows Live.

    ![Server form - new users](img/admin-server-new-users.png)

14. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

15. Click the **Save server** button.

    ![Server form - save](img/admin-server-windows-save.png)

16. Click the **Test OAuth integration** button. A Windows pop-up window will appear. Grant authorization when prompted. Afterward, the page should simply read "OK".

    ![Server form - test](img/admin-server-windows-test.png)

### Deactivating servers

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Edit server list** button.

   ![Server list - edit](img/admin-servers-edit.png)

3. The list will expand to show all servers, including those disabled or deleted earlier. Click the name of each server you wish to disable.

   ![Server list - select](img/admin-servers-disable-select.png)

4. Click the **Save server list** button.

   ![Server list - save](img/admin-servers-disable-save.png)

### Deleting a server

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the name of the server you wish to delete.

   ![Server list](img/admin-servers-choose.png)

3. Click the arrow beside the gray button, then **Delete server**.

   ![Server summary - delete](img/admin-server-delete.png)

If you've deleted a server by mistake, use the browser's back button to return to the page and click the **Restore server** button.

### Restoring deactivated or deleted servers

1. Click **Servers** in the left navigation pane.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Edit server list** button.

   ![Server list - edit](img/admin-servers-edit.png)

3. The list will expand to show all servers, including those who were deactivated or deleted earlier. Click the name of each server you wish to restore.

   ![Server list - select](img/admin-servers-restore-select.png)

4. Click the **Save server list** button.

   ![Server list - save](img/admin-servers-restore-save.png)

## Settings

* [Changing background image](#changing-background-image)
* [Changing site description](#changing-site-description)
* [Providing site descriptions in anther language](#providing-site-description-in-anther-language)

### Changing background image

1. Open a new browser window and sign into the web client. This will allow you see to changes as soon as you save them.

2. Click **Settings** in the left navigation pane.

   ![Navigation - Settings](img/admin-projects-nav-settings.png)

3. Click the **Edit settings** button.

   ![Settings - edit](img/admin-settings-edit.png)

4. Under **Background image**, click either **Upload image** or **Choose from album** and select an image.

   ![Settings - background image](img/admin-settings-background.png)

5. Click the **Save settings** button.

   ![Settings - save](img/admin-settings-save.png)

6. Check the appearance of the web client in the other browser window. If you're not satisfied, click the **Edit settings** button again.

### Changing site description

1. Open a new browser window and sign into the web client. This will allow you see to changes as soon as you save them.

2. Click **Settings** in the left navigation pane.

   ![Navigation - Settings](img/admin-projects-nav-settings.png)

3. Click the **Edit settings** button.

   ![Settings - edit](img/admin-settings-edit.png)

4. Edit the text in the text box under **Description**. If you're text text from elsewhere, be sure there aren't any stray newlines.

   ![Settings - background image](img/admin-settings-description.png)

5. Click the **Save settings** button.

   ![Settings - save](img/admin-settings-save.png)

6. Check the appearance of the web client in the other browser window. If you're not satisfied, click the **Edit settings** button again.

### Providing site description in anther language

1. Click **Settings** in the left navigation pane.

   ![Navigation - Settings](img/admin-projects-nav-settings.png)

2. Click the **Edit settings** button.

   ![Settings - edit](img/admin-settings-edit.png)

3. Under **Languages**, click the language you wish to add.

   ![Settings - languages](img/admin-settings-languages.png)

4. Language tabs will appear beneath text boxes that accept text in multiple languages. Under **Description**, click the language that you added.

   ![Settings - select language](img/admin-settings-description-polish-select.png)

5. Type or paste in the description in the chosen language.

   ![Settings - description](img/admin-settings-description-polish.png)

   Place the mouse cursor over the primary language to see the description in that language:

   ![Settings - mouse over](img/admin-settings-description-polish-mouseover.png)

6. Provide a site name in the new language if it's different.

7. Click the **Save settings** button.

   ![Settings - save](img/admin-settings-save-2.png)

You will now be able to enter project descriptions in the new language as well.
