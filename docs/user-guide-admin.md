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

1. Enter user name and password.

2. Click the **Sign in** button.

   ![Sign in - password](img/admin-sign-in-password.png)

### Signing in using OAuth

1. Click the **GitLab** button.

   ![Sign in - OAuth](img/admin-sign-in-oauth.png)

2. A GitLab pop-up window will appear. If you're not currently signed into
   GitLab, you're be asked to provide your credentials. Afterward, you'll be
   asked you to grant authorization to Trambar. Click the **Authorize** button.

   ![GitLab OAuth window](img/gitlab-oauth.png)

   The window may close itself immediately if Trambar is set as a trusted
   application and you're already signed in.

### Signing off

1. Click the user icon at the bottom of the left navigation, then **Sign off**.

   ![Sign off](img/admin-sign-off.png)

## Projects

* [Adding a new project](#adding-a-new-project)
* [Archiving old projects](#archiving-old-projects)
* [Deleting a project](#deleting-a-project)
* [Restoring a project](#restoring-a-project)

### Adding a new project

1. Click **Projects** in the left navigation.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the **Add new project** button.   

   ![Project list - add](img/admin-projects-add.png)

3. Enter the name and description of the project. Choose a project emblem.
   Indicate how new members are added and whether non-members may view the
   project's news feed.

   ![Project form](img/admin-project-form.png)

4. Click the **Save project** button.

   ![Project form - save](img/admin-project-save.png)

### Archiving old projects

1. Click **Projects** in the left navigation.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the **Edit project list** button.

   ![Project list - edit](img/admin-projects-edit.png)

3. The list will expand to show all projects, including those archived or
   deleted earlier. Click the name of each project that you wish to archive.

   ![Project list - select](img/admin-projects-archive-select.png)

4. Click the **Save project list** button.   

   ![Project list - archive](img/admin-projects-archive-save.png)

### Deleting a project

1. Click **Projects** in the left navigation.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project you wish to delete.

   ![Project list](img/admin-projects-choose.png)

3. Click the arrow beside the gray button, then **Delete project**.

   ![Project summary - delete](img/admin-project-delete.png)

If you delete a project by mistake, use the browser's back button to return to
the page and click the **Restore project** button.  

### Restoring a project

1. Click **Projects** in the left navigation.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the **Edit project list** button.

   ![Project list - edit](img/admin-projects-edit.png)

3. The list will expand to show all projects, including those archived or
   deleted earlier. Click the name of each project that you wish to restore.

   ![Project list - select](img/admin-projects-restore-select.png)

4. Click the **Save project list** button.   

   ![Project list - archive](img/admin-projects-restore-save.png)

## Members

* [Approving membership requests](#approving-membership-requests)
* [Rejecting membership requests](#rejecting-membership-requests)
* [Adding existing users](#adding-existing-users)
* [Adding a new member](#adding-a-new-member)
* [Removing members](#deleting-members)

### Approving membership requests

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

  ![Navigation - Members](img/admin-project-nav-members.png)

4. If there are unapproved requests, certain users will appear grayed out in
   the list. The **Approve all requests** button will be preselected. Click it
   to approve all requests.

   ![Member list - approve](img/admin-members-approve.png)

If you wish to add only some of the users, follow the [instructions for
adding users](#adding-existing-users) instead.

### Rejecting membership requests

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

  ![Navigation - Members](img/admin-project-nav-members.png)

4. If there are unapproved requests, certain users will appear grayed out in
   the list. The **Approve all requests** button will be preselected. Click the
   arrow beside it, then click **Reject all requests**.

   ![Member list - reject](img/admin-members-reject.png)

### Adding existing users

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. Click the **Edit member list** button.

   ![Member list - edit](img/admin-members-edit.png)

5. The list will expand to show all users. Click the name of each user that you
   wish to add.

   ![Member list -select](img/admin-members-add-select.png)

6. Click the **Save member list** button.   

   ![Member list - add](img/admin-members-add-save.png)

### Adding a new member

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Members** in the left navigation pane.

   ![Navigation - Members](img/admin-project-nav-members.png)

4. Click the arrow beside the gray button, then **Add new member**.

   ![Member list - new](img/admin-members-new.png)

5. Enter the new member's personal information. Select a profile image. Choose
   the user type and role.

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

5. The list will expand to show all users. Current members will be highlighted.
   Click the name of each member that you wish to remove.

   ![Member list -select](img/admin-members-remove-select.png)

6. Click the **Save member list** button.   

   ![Member list - add](img/admin-members-remove-save.png)

## Repositories

* [Adding repositories to project](adding-repositories)
* [Removing repositories](removing-repositories)

### Adding repositories to project

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Repositories** in the left navigation pane.

   ![Navigation - Repositories](img/admin-project-nav-repos.png)

4. Click the **Edit role list** button.

   ![Repo list - edit](img/admin-repos-edit.png)

5. The list will expand to show all repositories. Click the name of each repo
   you wish to associate with the project.

   ![Repo list - select](img/admin-repos-add-select.png)

6. Click the **Save repository list** button.   

   ![Repo list - save](img/admin-repos-add-save.png)

### Removing repositories

1. Click **Projects** in the left navigation pane.

   ![Navigation - Projects](img/admin-settings-nav-projects.png)

2. Click the name of the project.

   ![Project list](img/admin-projects-choose.png)

3. Click **Repositories** in the left navigation pane.

   ![Navigation - Repositories](img/admin-project-nav-repos.png)

4. Click the **Edit role list** button.

   ![Repo list - add](img/admin-repos-edit.png)

   The list will expand to show all repositories.

5. Click the name of each repo you wish to remove.   

   ![Repo list - select](img/admin-repos-remove-select.png)

6. Click the **Save repository list** button.   

   ![Repo list - save](img/admin-repos-remove-save.png)

## Users

* [Adding a new user](#adding-a-new-user)
* [Deactivating users](#deactivating-a-users)
* [Deleting a user](#deleting-a-user)
* [Restoring users](#restoring-users)

### Adding a new user

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

2. Click the **Add new user** button.   

   ![User list - add](img/admin-users-add.png)

3. Enter the new user's personal information. Select a profile image. Choose
   the user type and role.

   ![User form](img/admin-user-form.png)

4. Click the **Save user** button.

   ![User form - save](img/admin-user-save.png)

### Deactivating users

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

![User list - diable](img/admin-users-disable.png)

### Deleting a user

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

2. Click the name of the user you wish to delete.

   ![User list](img/admin-users-choose.png)

3. Click the arrow beside the gray button, then **Delete user account**.

   ![User summary - delete](img/admin-user-delete.png)

### Restoring users

1. Click **Users** in the left navigation pane.

   ![Navigation - Users](img/admin-settings-nav-users.png)

2. Click the **Edit user list** button.

   ![User list - edit](img/admin-users-edit-2.png)

3. The list will expand to show all users, including those who were deactivate
   or deleted earlier. Click the name of each user you wish to restore.

   ![User list - select](img/admin-users-restore-select.png)

4. Click the **Save user list** button.

   ![User list - save](img/admin-users-restore-save.png)

## Roles

* [Adding a new role](#adding-a-new-role)
* [Disabling roles](#disabling-roles)
* [Deleting a role](#deleting-a-role)
* [Assigning a role to users](#assigning-a-role-to-users)

### Adding a new role

1. Click **Roles** in the left navigation.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the **Add new role** button.   

   ![Roles - add](img/admin-roles-new.png)

3. Enter the name and description of the role. Select a story priority. Finally,
   choose the users to whom you wish to assign the new role.

   ![Role form](img/admin-role-form.png)

4. Click the **Save role** button.

   ![Role form - save](img/admin-role-save.png)

### Disabling roles

1. Click **Roles** in the left navigation.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the **Edit role list** button.

   ![Role list - edit](img/admin-roles-edit.png)

3. The list will expand to show all roles, including those disabled or deleted
   earlier. Click the name of each role you wish to disable.

   ![Role list - select](img/admin-roles-disable-select.png)

4. Click the **Save role list** button.

   ![Role list - save](img/admin-roles-disable-save.png)

### Deleting a role

1. Click **Roles** in the left navigation.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the name of the role you wish to delete.

   ![Roles list](img/admin-roles-choose.png)

3. Click the arrow beside the gray button, then **Delete role**.

   ![Role summary - delete](img/admin-role-delete.png)

If you delete a role by mistake. Use the browser's back button to return to the
page and click the **Restore role** button.

### Assigning a role to users

1. Click **Roles** in the left navigation.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the name of the role you wish to assign.

   ![Roles list](img/admin-roles-choose.png)

3. Click the **Edit role** button.

   ![Role summary - edit](img/admin-role-edit.png)

4. Under **Users**, click the name of each user to whom you wish to assign the
   role.   

   ![Role form - users](img/admin-role-form-users.png)

5. Click the **Save role** button.

   ![Role form - save](img/admin-role-save-2.png)

### Assigning a role automatically to new users   

1. Click **Servers** in the left navigation.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click on the name of the server whose users should be assigned the role.

   ![Server lists](img/admin-servers-choose.png)

3. Click the **Edit server button**

   ![Server summary - edit](img/admin-server-edit.png)

4. Under **Role assignments**, click the role that will be assigned to new users
   from the server.

   ![Server form - roles](img/admin-server-role.png)

5. Click the **Save server** button.

   ![Server form -save](img/admin-server-gitlab-save.png)

### Removing users from a role

1. Click **Roles** in the left navigation.

   ![Navigation - Roles](img/admin-settings-nav-roles.png)

2. Click the name of the role you wish to assign.

   ![Roles list](img/admin-roles-choose.png)

3. Click the **Edit role** button.

   ![Role summary - edit](img/admin-role-edit.png)

4. Under **Users**, click the name of each user you wish to remove from the
   role.   

   ![Role form - users](img/admin-role-form-users-2.png)

5. Click the **Save role** button.

   ![Role form - save](img/admin-role-save-2.png)

## Servers

* [Adding a GitLab server](#adding-a-gitlab-server)
* [Adding Dropbox](#adding-dropbox)
* [Adding Facebook](#adding-facebook)
* [Adding GitHub](#adding-github)
* [Adding Google+](#adding-google)
* [Adding Windows Live](#adding-windows-live)

### Adding a GitLab server

1. Click **Servers** in the left navigation.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *GitLab*.

   ![Server type](img/admin-server-gitlab-type.png)

4. In a different browser tab, sign into GitLab using an account with
   administrative privilege.

5. Navigate to the **Admin area**.

   ![GitLab start page](img/gitlab-home.png)

6. Click **Applications** in the left navigation pane.

   ![GitLab - admin area](img/gitlab-admin-area.png)

7. Click the **New application** button.

   ![GitLab - applications](img/gitlab-applications.png)

8. Enter *Trambar* as the application's name, then copy the **Redirect URI**
   from Trambar Administrative Console into the corresponding box here.
   Select **api** and **read_user** as the application's scope, the click the
   **Submit** button.

   ![Server form - Gitlab URL](img/admin-server-gitlab-callback.png)

   ![GitLab - new application](img/gitlab-application.png)

9. Copy the **Application id** and **Application secret** from GitLab into the
   corresponding box in Trambar Administrative Console.

   ![GitLab - new application](img/gitlab-application-summary.png)

   ![Server form - id & secret](img/admin-server-gitlab-secrets.png)

10. Copy the URL of the GitLab server into the corresponding box in Trambar
    Adminstrative Console.

    ![Server form - Gitlab URL](img/admin-server-gitlab-url.png)

    The URL should contains only the domain name (and possibly a port number).

11. Indicate how you wish to map users from GitLab to Trambar.

    ![Server form - user mapping](img/admin-server-gitlab-new-users.png)

12. Click the **Save server** button.

    ![Server form - save](img/admin-server-gitlab-save.png)

13. Click the **Acquire API access** button.

    ![Acquire API access](img/admin-server-acquire.png)

14. A GitLab pop-up window will appear. Click the **Authorize** button, then
    close the window when it says *OK*.

    ![GitLab OAuth window](img/gitlab-oauth.png)

### Adding Dropbox

1. Click **Servers** in the left navigation.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *Dropbox*.

   ![Server type](img/admin-server-dropbox-type.png)

4. In a different browser window, navigate to the [Dropbox App Console](https://www.dropbox.com/developers/apps)
   page.

5. Click the **Create app** button.

   ![Dropbox App list - add](img/dropbox-apps-add.png)

6. Select **Dropbox API**.

   ![Dropbox App - API](img/dropbox-app-api.png)

7. Select **App Folder** as the access level.

   ![Dropbox App - folder access](img/dropbox-app-folder-access.png)

   Trambar won't actually write anything to the folder. OAuth is used for
   authentication only.

8. Enter an application name. The name should contain the name of your company
   so that users will be able to correctly identify your app in Dropbox.

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

15. Click the **Test OAuth integration** button. A Dropbox pop-up window will
    appear. Grant authorization when prompted. Afterward, the page should simply
    read "OK".

   ![Server form - test](img/admin-server-dropbox-test.png)

16. Return to the Dropbox App Console. Click the **Apply for production**
    button to make the app publicly available.

   ![Dropbox App - apply](img/dropbox-app-apply.png)

### Adding Facebook

1. Click **Servers** in the left navigation.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *Facebook*.

   ![Server type](img/admin-server-facebook-type.png)

4. In a different browser window, navigate to the [Facebook App Dashboard](https://developers.facebook.com/apps/).

5. Click the **Add a New App** button.

   ![Facebook App Dashboard - add](img/facebook-apps-add.png)

6. Enter a display name and a contact e-mail address. The display name should
   contain the name of your company so that users will be able to correctly
   identify your app.

   ![Facebook App - create](img/facebook-app-dialog.png)

7. Click the **Create App ID** button

   ![Facebook App - create](img/facebook-app-dialog-create.png)

8. In the box label **Facebook Login**, click the **Set up** button.

   ![Facebook Login - start](img/facebook-app-login-setup.png)

9. Select **WWW** as the platform.

   ![Facebook Login - platform](img/facebook-app-platform-www.png)

10. Copy and paste site URL.

   ![Server form - site url](img/admin-server-site-url.png)

   ![Facebook Login - site url](img/facebook-app-site-url.png)

11. Click the **Save button**.

    ![Facebook Login - site url](img/facebook-app-site-url-save.png)

12. Click **Settings** under **Facebook Login** in the left navigation pane.

    ![Facebook Login - settings](img/facebook-app-site-url-nav-settings.png)

13. Copy and paste **Redirect URI**.

    ![Server form - redirect URL](img/admin-server-facebook-callback.png)

    ![Facebook Login - redirect URI](img/facebook-app-redirect-uri.png)

14. Click the **Save Changes** button at the bottom of the page.

    ![Facebook Login - save](img/facebook-app-save.png)

15. Click **Basic** under **Settings** in the left navigation pane.

    ![Facebook Login](img/facebook-app-login-nav-basic.png)

16. Copy and paste **Privacy policy** and **Terms** (or supply your own).

    ![Server form - terms](img/admin-server-facebook-terms.png)

    ![Facebook App - terms](img/facebook-app-terms.png)

17. Download the default icon from Trambar Adminstrative Console.

    ![Server form - default icon](img/admin-server-facebook-icons.png)

    Click **App icon** and upload the image file.

    ![Facebook App - icon](img/facebook-app-icon.png)

18. Choose *Utility & Productivity* as the app category.

    ![Facebook App - category](img/facebook-app-category.png)

19. Click the **Save Changes** button at the bottom of the page.

    ![Facebook Login - save](img/facebook-app-save.png)

20. Copy and paste **App ID** into Trambar Administrative Console.

    ![Facebook App - id](img/facebook-app-id.png)

    ![Server form - app id](img/admin-server-facebook-app-id.png)

21. Click the **Show** button in the *App Secret** text box. Copy and paste the
    secret token into Trambar Administrative Console.    

    ![Facebook App - secret](img/facebook-app-secret.png)

    ![Server form - app secret](img/admin-server-facebook-app-secret.png)

22. Under **New users** select a user type for users coming from Facebook.

    ![Server form - new users](img/admin-server-new-users.png)

23. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

24. Click the **Save server** button.

    ![Server form - save](img/admin-server-facebook-save.png)

25. Click the **Test OAuth integration** button. A Facebook pop-up window will
    appear. Grant authorization when prompted. Afterward, the page should simply
    read "OK".

    ![Server form - test](img/admin-server-facebook-test.png)

26. Return to the Facebook App Dashboard. Click the **OFF** switch and confirm
    that you wish to make the app public.

    ![Facebook App - off](img/facebook-app-off.png)


### Adding GitHub

1. Click **Servers** in the left navigation.

   ![Navigation - Servers](img/admin-settings-nav-servers.png)

2. Click the **Add new server** button.

   ![Server list - add](img/admin-servers-add.png)

3. Under **Server type**, select *GitHub*.

   ![Server type](img/admin-server-github-type.png)

4. In a different browser window, navigate to the [GitHub Developer Settings](https://github.com/settings/developers)
   page.

5. Click the **New OAuth App** button.

   ![GitHub App list - add](img/github-apps-add.png)

6. Enter an application name. The name should contain the name of your company
   so that users will be able to correctly identify your app in GitHub.

   ![GitHub App - name](img/github-app-name.png)

7. Copy the **Site URL** from Trambar Administrative Console and use it as the
   app's **Homepage URL**.

   ![Server form - site URL](img/admin-server-site-url.png)

   ![GitHub App - homepage](img/github-app-homepage.png)

8. Copy and paste the **Callback URL**.

   ![Server form - callback URL](img/admin-server-github-callback.png)

   ![GitHub App - callback](img/github-app-callback.png)

9. Click the **Register Application** button.

   ![GitHub App - register](img/github-app-register.png)

10. Download the default app icon from Trambar Administrative Console.

   ![Server form - icon](img/admin-server-github-icons.png)

   Click the **Upload new logo** under **Application logo** and upload the image
   file.

   ![GitHub App - icon](img/github-app-icon.png)

11. Set the **Badge color** to `#f29d25`.

   ![GitHub App - badge color](img/github-app-badge-color.png)

12. Click the **Update application** button.

   ![GitHub App - update](img/github-app-update.png)

13. Copy and paste the **Client ID** and **Client secret** into Trambar
    ADministrative Console.

    ![GitHub App - secrets](img/github-app-client-secrets.png)

    ![Server form - secrets](img/admin-server-github-secrets.png)

14. Under **New users** select a user type for users coming from GitHub.

    ![Server form - new users](img/admin-server-new-users.png)

15. Optionally, choose a role for new users under **Role assignment**.

    ![Server form - role](img/admin-server-role.png)

16. Click the **Save server** button.

    ![Server form - save](img/admin-server-github-save.png)

17. Click the **Test OAuth integration** button. A GitHub pop-up window will
    appear. Grant authorization when prompted. Afterward, the page should simply
    read "OK".

    ![Server form - test](img/admin-server-github-test.png)

### Adding Google+

### Adding Windows Live

### Disabling server

![Server list - edit](img/admin-servers-edit.png)

![Server list - disable](img/admin-servers-disable-save.png)

## Settings

* [Changing background image](#changing-background-image)
* [Changing site description](#changing-site-description)
* [Providing site descriptions in anther language](#providing-site-description-in-anther-language)

### Changing background image

1. Open a new browser window and sign into the Trambar web client. This will
   allow you see to changes as soon as you save them.

2. Click **Settings** in the left navigation.

   ![Navigation - Settings](img/admin-projects-nav-settings.png)

3. Click the **Edit settings** button.

   ![Settings - edit](img/admin-settings-edit.png)

4. Under **Background image**, click either **Upload image** or **Choose from
   album** and select an image.

   ![Settings - background image](img/admin-settings-background.png)

5. Click the **Save settings** button.

   ![Settings - save](img/admin-settings-save.png)

6. Check the appearance of the web client in the other browser window. If you're
   not satistfied with it, click the **Edit settings** button again.

### Changing site description

1. Open a new browser window and sign into the Trambar web client. This will
   allow you see to changes as soon as you save them.

2. Click **Settings** in the left navigation.

   ![Navigation - Settings](img/admin-projects-nav-settings.png)

3. Click the **Edit settings** button.

   ![Settings - edit](img/admin-settings-edit.png)

4. Edit the text in the text box under **Description**. If you're text text from
   elsewhere, be sure there aren't any stray newlines.

   ![Settings - background image](img/admin-settings-description.png)

5. Click the **Save settings** button.

   ![Settings - save](img/admin-settings-save.png)

6. Check the appearance of the web client in the other browser window. If you're
   not satisfied with it, click the **Edit settings** button again.

### Providing site description in anther language

1. Click **Settings** in the left navigation.

   ![Navigation - Settings](img/admin-projects-nav-settings.png)

2. Click the **Edit settings** button.

   ![Settings - edit](img/admin-settings-edit.png)

3. Under **Languages**, click the language you wish to add.

   ![Settings - languages](img/admin-settings-languages.png)

4. Under **Description**, click the language that you added.

   ![Settings - select language](img/admin-settings-description-polish-select.png)

5. Type or paste in the description in the chosen language.

   ![Settings - description](img/admin-settings-description-polish.png)

   Place the mouse cursor over the primary language to see the description in
   that language:

   ![Settings - mouse over](img/admin-settings-description-polish-mouseover.png)

6. Provide a site name in the new language if it's different.

7. Click the **Save settings** button.

   ![Settings - save](img/admin-settings-save-2.png)

You will now be able to enter project descriptions in the new language as well.
