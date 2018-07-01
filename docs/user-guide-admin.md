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

   ![Server form - roles](img/admin-server-form-roles.png)

5. Click the **Save server** button.

   ![Server form -save](img/admin-server-save.png)

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

### Adding Dropbox

### Adding Facebook

### Adding GitHub

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
