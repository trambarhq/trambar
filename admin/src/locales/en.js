require('moment/locale/en-au');
require('moment/locale/en-ca');
require('moment/locale/en-gb');
require('moment/locale/en-ie');
require('moment/locale/en-nz');

module.exports = function(localeCode) {
    return {
        'action-badge-add': 'add',
        'action-badge-approve': 'approve',
        'action-badge-archive': 'archive',
        'action-badge-disable': 'disable',
        'action-badge-reactivate': 'reactivate',
        'action-badge-remove': 'remove',
        'action-badge-restore': 'restore',

        'activity-chart-legend-branch': 'New branches',
        'activity-chart-legend-issue': 'Issues',
        'activity-chart-legend-member': 'Membership changes',
        'activity-chart-legend-merge': 'Code merges',
        'activity-chart-legend-merge-request': 'Merge requests',
        'activity-chart-legend-milestone': 'Milestones',
        'activity-chart-legend-post': 'Posts',
        'activity-chart-legend-push': 'Code pushes',
        'activity-chart-legend-repo': 'Repository changes',
        'activity-chart-legend-survey': 'Surveys',
        'activity-chart-legend-task-list': 'Task lists',
        'activity-chart-legend-wiki': 'Wiki edits',

        'activity-tooltip-$count': (count) => {
            return (count === 1) ? `1 story` : `${count} stories`;
        },
        'activity-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 branch` : `${count} branches`;
        },
        'activity-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 issue` : `${count} issues`;
        },
        'activity-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 membership change` : `${count} membership changes`;
        },
        'activity-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 merge` : `${count} merges`;
        },
        'activity-tooltip-$count-merge-request': (count) => {
            return (count === 1) ? `1 merge request` : `${count} merge requests`;
        },
        'activity-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 milestone` : `${count} milestones`;
        },
        'activity-tooltip-$count-post': (count) => {
            return (count === 1) ? `1 post` : `${count} posts`;
        },
        'activity-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pushes`;
        },
        'activity-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 repository change` : `${count} repository changes`;
        },
        'activity-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 survey` : `${count} surveys`;
        },
        'activity-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 task list` : `${count} task lists`;
        },
        'activity-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki edit` : `${count} wiki edits`;
        },

        'app-name': 'Trambar',
        'app-title': 'Trambar - Administrative Console',

        'confirmation-cancel': 'Cancel',
        'confirmation-confirm': 'Confirm',
        'confirmation-data-loss': 'Are you sure you want to abandon changes you have made?',

        'date-range-$start-$end': (start, end) => {
            if (start) {
                if (end) {
                    return `${start}–${end}`;
                } else {
                    return `${start}–`;
                }
            }
            return '';
        },

        'image-album-cancel': 'Cancel',
        'image-album-done': 'Done',
        'image-album-manage': 'Manage album',
        'image-album-remove': 'Remove selected',
        'image-album-select': 'Use selected',
        'image-album-upload': 'Upload files',

        'image-cropping-cancel': 'Cancel',
        'image-cropping-select': 'OK',

        'image-selector-choose-from-album': 'Choose from album',
        'image-selector-crop-image': 'Adjust size/position',
        'image-selector-upload-file': 'Upload image',

        'member-list-$name-with-$username': (name, username) => {
            if (name) {
                if (username) {
                    return `${name} (${username})`;
                } else {
                    return name;
                }
            } else {
                return username;
            }
        },
        'member-list-add': 'Add new user',
        'member-list-approve-all': 'Approve all requests',
        'member-list-cancel': 'Cancel',
        'member-list-edit': 'Edit member List',
        'member-list-reject-all': 'Reject all requests',
        'member-list-save': 'Save member List',
        'member-list-status-non-member': 'Not a member',
        'member-list-status-pending': 'Request pending',
        'member-list-title': 'Members',

        'nav-member-new': 'New member',
        'nav-members': 'Members',
        'nav-project-new': 'New project',
        'nav-projects': 'Projects',
        'nav-repositories': 'Repositories',
        'nav-role-new': 'New role',
        'nav-roles': 'Roles',
        'nav-server-new': 'New server',
        'nav-servers': 'Servers',
        'nav-settings': 'Settings',
        'nav-user-new': 'New user',
        'nav-users': 'Users',

        'project-list-$title-with-$name': (title, name) => {
            if (title) {
                return `${title} (${name})`;
            } else {
                return name;
            }
        },
        'project-list-add': 'Add new project',
        'project-list-cancel': 'Cancel',
        'project-list-confirm-archive-$count': (count) => {
            var projects = (count === 1) ? 'the selected project' : `these ${count} projects`;
            return `Are you sure you want to archive ${projects}?`;
        },
        'project-list-confirm-restore-$count': (count) => {
            var projects = (count === 1) ? 'the selected project' : `these ${count} projects`;
            return `Are you sure you want to restore ${projects}?`;
        },
        'project-list-deleted': 'Deleted',
        'project-list-edit': 'Edit project list',
        'project-list-save': 'Save project list',
        'project-list-status-archived': 'Archived',
        'project-list-status-deleted': 'Deleted',
        'project-list-title': 'Projects',

        'project-summary-$title': (title) => {
            var text = 'Project';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'project-summary-access-control': 'Access control',
        'project-summary-access-control-member-only': 'Project contents are restricted to members only',
        'project-summary-access-control-non-member-comment': 'Non-members can comment on stories',
        'project-summary-access-control-non-member-view': 'Non-members can view contents',
        'project-summary-add': 'Add new project',
        'project-summary-archive': 'Archive project',
        'project-summary-cancel': 'Cancel',
        'project-summary-confirm-archive': 'Are you sure you want to archive this project?',
        'project-summary-confirm-delete': 'Are you sure you want to delete this project?',
        'project-summary-confirm-restore': 'Are you sure you want to restore this project?',
        'project-summary-delete': 'Delete project',
        'project-summary-description': 'Description',
        'project-summary-edit': 'Edit project',
        'project-summary-emblem': 'Emblem',
        'project-summary-name': 'Identifier',
        'project-summary-new-members': 'New members',
        'project-summary-new-members-auto-accept-guest': 'Guests users are accepted automatically',
        'project-summary-new-members-auto-accept-user': 'Regular users are accepted automatically',
        'project-summary-new-members-join-guest': 'Guests can request to join project',
        'project-summary-new-members-join-user': 'Regular users can request to join project',
        'project-summary-new-members-manual': 'Members are added manually',
        'project-summary-other-actions': 'Other actions',
        'project-summary-restore': 'Restore project',
        'project-summary-return': 'Return to project list',
        'project-summary-save': 'Save project',
        'project-summary-statistics': 'Activities',
        'project-summary-title': 'Name',

        'project-tooltip-$count-others': (count) => {
            return (count === 1) ? `1 other` : `${count} others`;
        },

        'repo-list-cancel': 'Cancel',
        'repo-list-confirm-remove-$count': (count) => {
            var repositories = (count === 1) ? `this repository` : `these ${count} repositories`;
            return `Are you sure you want to remove ${repositories} from the project?`;
        },
        'repo-list-edit': 'Edit repository list',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': 'Enabled',
        'repo-list-save': 'Save repository list',
        'repo-list-title': 'Repositories',

        'repo-summary-$title': (title) => {
            var text = `Repository`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'repo-summary-cancel': 'Cancel',
        'repo-summary-confirm-remove': 'Are you sure you want to remove this repository from the project?',
        'repo-summary-confirm-restore': 'Are you sure you want to add this repository to the project again?',
        'repo-summary-edit': 'Edit repository',
        'repo-summary-gitlab-name': 'GitLab project name',
        'repo-summary-issue-tracker': 'Issue tracker',
        'repo-summary-issue-tracker-disabled': 'Disabled',
        'repo-summary-issue-tracker-enabled': 'Enabled',
        'repo-summary-remove': 'Remove repository',
        'repo-summary-restore': 'Restore repository',
        'repo-summary-return': 'Return to repository list',
        'repo-summary-save': 'Save repository',
        'repo-summary-statistics': 'Activities',
        'repo-summary-title': 'Name',

        'repository-tooltip-$count': (count) => {
            return (count === 1) ? `1 repository` : `${count} repositories`;
        },

        'role-list-add': 'Add new role',
        'role-list-cancel': 'Cancel',
        'role-list-confirm-disable-$count': (count) => {
            var roles = (count === 1) ? `this role` : `these ${count} roles`;
            return `Are you sure you want to disable ${roles}?`
        },
        'role-list-confirm-reactivate-$count': (count) => {
            var roles = (count === 1) ? `this role` : `these ${count} roles`;
            return `Are you sure you want to reactivate ${roles}?`
        },
        'role-list-edit': 'Edit role list',
        'role-list-save': 'Save role list',
        'role-list-status-deleted': 'Deleted',
        'role-list-status-disabled': 'Disabled',
        'role-list-title': 'Roles',

        'role-summary-$title': (title) => {
            var text = 'Role';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'role-summary-add': 'Add new role',
        'role-summary-cancel': 'Cancel',
        'role-summary-confirm-delete': 'Are you sure you want to delete this role?',
        'role-summary-confirm-disable': 'Are you sure you want to disable this role?',
        'role-summary-confirm-reactivate': 'Are you sure you want to reactivate this role?',
        'role-summary-delete': 'Delete role',
        'role-summary-description': 'Description',
        'role-summary-disable': 'Disable role',
        'role-summary-edit': 'Edit role',
        'role-summary-name': 'Identifier',
        'role-summary-rating': 'Story priority',
        'role-summary-rating-high': 'High',
        'role-summary-rating-low': 'Low',
        'role-summary-rating-normal': 'Normal',
        'role-summary-rating-very-high': 'Very high',
        'role-summary-rating-very-low': 'Very low',
        'role-summary-reactivate': 'Reactivate role',
        'role-summary-return': 'Return to role list',
        'role-summary-save': 'Save role',
        'role-summary-title': 'Name',
        'role-summary-users': 'Users',

        'role-tooltip-$count-others': (count) => {
            return (count === 1) ? `1 other` : `${count} others`;
        },

        'server-list-add': 'Add new server',
        'server-list-api-access-false': '',
        'server-list-api-access-true': 'Acquired',
        'server-list-cancel': 'Cancel',
        'server-list-confirm-disable-$count': (count) => {
            var servers = (count === 1) ? `this server` : `these ${count} servers`;
            return `Are you sure you want to disable ${servers}?`
        },
        'server-list-confirm-reactivate-$count': (count) => {
            var servers = (count === 1) ? `this server` : `these ${count} servers`;
            return `Are you sure you want to reactivate ${servers}?`
        },
        'server-list-edit': 'Edit server list',
        'server-list-oauth-false': '',
        'server-list-oauth-true': 'Active',
        'server-list-save': 'Save server list',
        'server-list-status-deleted': 'Deleted',
        'server-list-status-disabled': 'Disabled',
        'server-list-title': 'Servers',

        'server-summary-acquire': 'Acquire API access',
        'server-summary-activities': 'Activities',
        'server-summary-add': 'Add new server',
        'server-summary-api-access': 'API access',
        'server-summary-api-access-acquired': 'Administrative access acquired',
        'server-summary-api-access-not-applicable': 'Not applicable',
        'server-summary-api-access-pending': 'Waiting for user action',
        'server-summary-cancel': 'Cancel',
        'server-summary-confirm-delete': 'Are you sure you want to delete this server?',
        'server-summary-confirm-disable': 'Are you sure you want to disable this server?',
        'server-summary-confirm-reactivate': 'Are you sure you want to reactivate this server?',
        'server-summary-delete': 'Delete server',
        'server-summary-disable': 'Disable server',
        'server-summary-edit': 'Edit server',
        'server-summary-gitlab-admin': 'GitLab administrator',
        'server-summary-gitlab-external-user': 'GitLab external user',
        'server-summary-gitlab-regular-user': 'GitLab regular user',
        'server-summary-member-$name': (name) => {
            return `Server: ${name}`;
        },
        'server-summary-name': 'Identifier',
        'server-summary-new-user': 'New user',
        'server-summary-new-users': 'New users',
        'server-summary-oauth-app-id': 'App ID',
        'server-summary-oauth-app-key': 'App key',
        'server-summary-oauth-app-secret': 'App secret',
        'server-summary-oauth-application-id': 'Application ID',
        'server-summary-oauth-application-secret': 'Application secret',
        'server-summary-oauth-callback-url': 'Callback URL',
        'server-summary-oauth-client-id': 'Client ID',
        'server-summary-oauth-client-secret': 'Client secret',
        'server-summary-oauth-gitlab-url': 'GitLab URL',
        'server-summary-oauth-redirect-uri': 'Redirect URI',
        'server-summary-oauth-redirect-url': 'Redirect URL',
        'server-summary-oauth-site-url': 'Site URL',
        'server-summary-reactivate': 'Reactivate server',
        'server-summary-return': 'Return to server list',
        'server-summary-role-none': 'Do not assign any roles to new users',
        'server-summary-roles': 'Role assignment',
        'server-summary-save': 'Save server',
        'server-summary-system-address-missing': 'System address has not been set',
        'server-summary-test-oauth': 'Test OAuth integration',
        'server-summary-title': 'Name',
        'server-summary-type': 'Server type',
        'server-summary-user-automatic-approval': 'Approve new users automatically',
        'server-summary-user-import-disabled': 'Do not register new users',
        'server-summary-user-import-gitlab-admin-disabled': 'Do not import GitLab administrators',
        'server-summary-user-import-gitlab-external-user-disabled': 'Do not import GitLab external users',
        'server-summary-user-import-gitlab-user-disabled': 'Do not import GitLab users',
        'server-summary-user-type-admin': 'Administrator',
        'server-summary-user-type-guest': 'Guest',
        'server-summary-user-type-moderator': 'Moderator',
        'server-summary-user-type-regular': 'Regular user',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-background-image': 'Background image',
        'settings-cancel': 'Cancel',
        'settings-edit': 'Edit settings',
        'settings-input-languages': 'Input languages',
        'settings-push-relay': 'Push relay',
        'settings-save': 'Save settings',
        'settings-site-address': 'Address',
        'settings-site-description': 'Description',
        'settings-site-title': 'Site name',
        'settings-title': 'Settings',

        'sign-in-$title': (title) => {
            var text = `Sign in`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'sign-in-error-access-denied': 'Request for access rejected',
        'sign-in-error-account-disabled': 'Account is currently disabled',
        'sign-in-error-existing-users-only': 'Only authorized personnel can access this system',
        'sign-in-error-restricted-area': 'User is not an administrator',
        'sign-in-oauth': 'Sign in through OAuth',
        'sign-in-password': 'Password:',
        'sign-in-problem-incorrect-username-password': 'Incorrect user name or password',
        'sign-in-problem-no-support-for-username-password': 'System does not accept password',
        'sign-in-problem-unexpected-error': 'Unexpected error encountered',
        'sign-in-submit': 'Sign in',
        'sign-in-username': 'User name:',

        'sign-off-menu-sign-off': 'Sign off',

        'table-heading-api-access': 'API access﻿',
        'table-heading-date-range': 'Active period',
        'table-heading-email': 'E-mail',
        'table-heading-issue-tracker': 'Issue tracker',
        'table-heading-last-modified': 'Last modified',
        'table-heading-last-month': 'Last month',
        'table-heading-name': 'Name',
        'table-heading-oauth': 'OAuth authentication',
        'table-heading-projects': 'Projects',
        'table-heading-repositories': 'Repositories',
        'table-heading-roles': 'Roles',
        'table-heading-server': 'Server',
        'table-heading-this-month': 'This month',
        'table-heading-title': 'Name',
        'table-heading-to-date': 'To date',
        'table-heading-type': 'Type',
        'table-heading-users': 'Users',

        'task-$seconds': (seconds) => {
            return (seconds === 1) ? `1 second` : `${seconds} seconds`;
        },
        'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 commit comment` : `${count} commit comments`;
            return `Imported ${comments} from “${repo}”`;
        },
        'task-imported-$count-events-from-$repo': (count, repo) => {
            var events = (count === 1) ? `1 event` : `${count} events`;
            return `Imported ${events} from “${repo}”`;
        },
        'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 issue comment` : `${count} issue comments`;
            return `Imported ${comments} from “${repo}”`;
        },
        'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 merge-request comment` : `${count} merge-request comments`;
            return `Imported ${comments} from “${repo}”`;
        },
        'task-imported-$count-repos': (count) => {
            var repos = (count === 1) ? `1 repository` : `${count} repositories`;
            return `Imported ${repos}`;
        },
        'task-imported-$count-users': (count) => {
            var users = (count === 1) ? `1 user` : `${count} users`;
            return `Imported ${users}`;
        },
        'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
            var commits = (count === 1) ? `1 commit` : `${count} commits`;
            return `Imported push with ${commits} from “${branch}” of “${repo}”`;
        },
        'task-importing-commit-comments-from-$repo': (repo) => {
            return `Importing commit comments from “${repo}”`;
        },
        'task-importing-events-from-$repo': (repo) => {
            return `Importing events from “${repo}”`;
        },
        'task-importing-issue-comments-from-$repo': (repo) => {
            return `Importing issue comments from “${repo}”`;
        },
        'task-importing-merge-request-comments-from-$repo': (repo) => {
            return `Importing merge-request comments from “${repo}”`;
        },
        'task-importing-push-from-$repo': (repo) => {
            return `Importing push from “${repo}”`;
        },
        'task-importing-repos': 'Importing repositories',
        'task-importing-users': 'Importing users',
        'task-installed-$count-hooks': (count) => {
            var hooks = (count === 1) ? `1 project hook` : `${count} project hooks`;
            return `Installed ${hooks}`;
        },
        'task-installing-hooks': 'Installing hooks',
        'task-removed-$count-hooks': (count) => {
            var hooks = (count === 1) ? `1 project hook` : `${count} project hooks`;
            return `Removed ${hooks}`;
        },
        'task-removed-$count-repos': (count) => {
            var repos = (count === 1) ? `1 repository` : `${count} repositories`;
            return `Removed ${repos}`;
        },
        'task-removed-$count-users': (count) => {
            var users = (count === 1) ? `1 user` : `${count} users`;
            return `Removed ${users}`;
        },
        'task-removing-hooks': 'Uninstalling hooks',
        'task-updated-$count-repos': (count) => {
            var repos = (count === 1) ? `1 repository` : `${count} repositories`;
            return `Updated ${repos}`;
        },
        'task-updated-$count-users': (count) => {
            var users = (count === 1) ? `1 user` : `${count} users`;
            return `Updated ${users}`;
        },

        'text-field-placeholder-none': 'none',

        'tooltip-$first-and-$tooltip': (first, tooltip) => {
            return [ first, ' and ', tooltip ];
        },
        'tooltip-more': 'More',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 file` : `${count} files`;
            return `Uploading ${files}, ${size} remaining`;
        },

        'user-list-$name-with-$username': (name, username) => {
            if (name) {
                if (username) {
                    return `${name} (${username})`;
                } else {
                    return name;
                }
            } else {
                return username;
            }
        },
        'user-list-add': 'Add new user',
        'user-list-approve-all': 'Approve all requests',
        'user-list-cancel': 'Cancel',
        'user-list-confirm-disable-$count': (count) => {
            var accounts = (count === 1) ? `this user account` : `these ${count} user accounts`;
            return `Are you sure you want to disable ${accounts}?`
        },
        'user-list-confirm-reactivate-$count': (count) => {
            var accounts = (count === 1) ? `this user account` : `these ${count} user accounts`;
            return `Are you sure you want to reactivate ${accounts}?`
        },
        'user-list-edit': 'Edit user List',
        'user-list-reject-all': 'Reject all requests',
        'user-list-save': 'Save user list',
        'user-list-status-deleted': 'Deleted',
        'user-list-status-disabled': 'Account disabled',
        'user-list-status-pending': 'Approval pending',
        'user-list-title': 'Users',
        'user-list-type-admin': 'Administrator',
        'user-list-type-guest': 'Guest',
        'user-list-type-moderator': 'Moderator',
        'user-list-type-regular': 'Regular user',
        'user-summary-$name': (name) => {
            var text = 'User';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-add': 'Add new user',
        'user-summary-cancel': 'Cancel',
        'user-summary-confirm-delete': 'Are you sure you want to delete this user account?',
        'user-summary-confirm-disable': 'Are you sure you want to disable this user account?',
        'user-summary-confirm-reactivate': 'Are you sure you want to reactivate this user account?',
        'user-summary-delete': 'Delete user account',
        'user-summary-disable': 'Disable user account',
        'user-summary-edit': 'Edit user',
        'user-summary-email': 'E-mail',
        'user-summary-github': 'GitHub profile URL',
        'user-summary-gitlab': 'GitLab profile URL',
        'user-summary-ichat': 'iChat user name',
        'user-summary-linkedin': 'Linkedin profile URL',
        'user-summary-member-$name': (name) => {
            var text = 'User';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-member-edit': 'Edit member',
        'user-summary-member-return': 'Return to member list',
        'user-summary-member-save': 'Save member',
        'user-summary-name': 'Name',
        'user-summary-phone': 'Phone number',
        'user-summary-profile-image': 'Profile image',
        'user-summary-reactivate': 'Reactivate user account',
        'user-summary-return': 'Return to user list',
        'user-summary-role-none': 'None',
        'user-summary-roles': 'Roles',
        'user-summary-save': 'Save user',
        'user-summary-skype': 'Skype user name',
        'user-summary-slack': 'Slack user id',
        'user-summary-slack-team': 'Slack team id',
        'user-summary-social-links': 'Social links',
        'user-summary-stackoverflow': 'Stack Overflow profile URL',
        'user-summary-statistics': 'Activities',
        'user-summary-twitter': 'Twitter user name',
        'user-summary-type': 'User type',
        'user-summary-type-admin': 'Administrator',
        'user-summary-type-guest': 'Guest',
        'user-summary-type-moderator': 'Moderator',
        'user-summary-type-regular': 'Regular user',
        'user-summary-username': 'User name',

        'user-tooltip-$count': (count) => {
            return (count === 1) ? `1 user` : `${count} users`;
        },

        'validation-duplicate-project-name': 'A project with that identifier already exists',
        'validation-duplicate-role-name': 'A role with that identifier already exists',
        'validation-duplicate-server-name': 'A server with that identifier already exists',
        'validation-duplicate-user-name': 'A user with that name already exists',
        'validation-illegal-project-name': 'Project identifier cannot be "global" or "admin"',
        'validation-password-for-admin-only': 'Only administrators can sign in using password',
        'validation-required': 'Required',

        'welcome': 'Welcome!',
    };
};
