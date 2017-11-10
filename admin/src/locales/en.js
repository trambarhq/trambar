module.exports = function(languageCode) {
    return {
        'action-badge-add': 'add',
        'action-badge-approve': 'approve',
        'action-badge-archive': 'archive',
        'action-badge-disable': 'disable',
        'action-badge-reactivate': 'reactivate',
        'action-badge-remove': 'remove',
        'action-badge-restore': 'restore',

        'activity-chart-legend-branch': 'New branches',
        'activity-chart-legend-push': 'Code pushes',
        'activity-chart-legend-issue': 'Issues',
        'activity-chart-legend-member': 'Membership changes',
        'activity-chart-legend-merge': 'Code merges',
        'activity-chart-legend-milestone': 'Milestones',
        'activity-chart-legend-repo': 'Repository changes',
        'activity-chart-legend-story': 'Stories',
        'activity-chart-legend-survey': 'Surveys',
        'activity-chart-legend-task-list': 'Task lists',
        'activity-chart-legend-wiki': 'Wiki edits',

        'activity-tooltip-$count': (count) => {
            return (count === 1) ? `1 story` : `${count} stories`;
        },
        'activity-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pushes`;
        },
        'activity-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 issue` : `${count} issues`;
        },
        'activity-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 membership change` : `${count} membership changes`;
        },
        'activity-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 milestone` : `${count} milestones`;
        },
        'activity-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 repository change` : `${count} repository changes`;
        },
        'activity-tooltip-$count-story': (count) => {
            return (count === 1) ? `1 story` : `${count} stories`;
        },
        'activity-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 survey` : `${count} surveys`;
        },
        'activity-tooltip-$count-tasj-list': (count) => {
            return (count === 1) ? `1 task list` : `${count} task lists`;
        },
        'activity-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki edit` : `${count} wiki edits`;
        },

        'app-name': 'Trambar',
        'app-title': 'Trambar - Administrative Console',

        'combo-button-other-actions': 'Other actions',

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
        'image-album-manage': 'Manage album',
        'image-album-remove': 'Remove selected',
        'image-album-select': 'Use selected',
        'image-album-upload': 'Upload files',

        'image-cropping-cancel': 'Cancel',
        'image-cropping-select': 'OK',

        'image-selector-crop-image': 'Adjust size/position',
        'image-selector-choose-from-album': 'Choose from album',
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
        'member-list-approve-all': 'Approve all requests',
        'member-list-cancel': 'Cancel',
        'member-list-edit': 'Edit member List',
        'member-list-new': 'Add new user',
        'member-list-reject-all': 'Approve all requests',
        'member-list-save': 'Save member List',
        'member-list-selective-approve': 'Selectively approve',
        'member-list-title': 'Members',

        'nav-member-new': 'New member',
        'nav-members': 'Members',
        'nav-projects': 'Projects',
        'nav-project-new': 'New project',
        'nav-repositories': 'Repositories',
        'nav-roles': 'Roles',
        'nav-role-new': 'New role',
        'nav-servers': 'Servers',
        'nav-server-new': 'New server',
        'nav-settings': 'Settings',
        'nav-users': 'Users',
        'nav-user-new': 'New user',

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
        'project-list-title': 'Projects',

        'project-summary-$title': (title) => {
            var text = 'Project';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'project-summary-access-control': 'Access control',
        'project-summary-access-control-approved-user-read-only': 'Approved users can view contents but cannot post',
        'project-summary-access-control-member-only': 'Only project members can view contents',
        'project-summary-access-control-team-member-read-only': 'Team members can view contents but cannot post',
        'project-summary-access-control-pending-user-read-only': 'Pending users can view contents but cannot post',
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
        'project-summary-new-members-allow-request': 'People can request to join project',
        'project-summary-new-members-approved-user-auto-join': 'Approved users become members automatically',
        'project-summary-new-members-manual': 'Members are added manually',
        'project-summary-new-members-team-member-auto-join': 'Team members become project members automatically',
        'project-summary-other-actions': 'Other actions',
        'project-summary-restore': 'Restore project',
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
        'repo-summary-issue-tracker-import-allowed': 'Allow team members to copy post into issue tracker',
        'repo-summary-issue-tracker-import-disallowed': 'Do not provide issue tracking option',
        'repo-summary-issue-tracker-not-available': 'Not available',
        'repo-summary-remove': 'Remove repository',
        'repo-summary-restore': 'Restore repository',
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
        'role-summary-cancel': 'Cancel',
        'role-summary-confirm-delete': 'Are you sure you want to delete this role?',
        'role-summary-confirm-disable': 'Are you sure you want to disable this role?',
        'role-summary-confirm-reactivate': 'Are you sure you want to reactivate this role?',
        'role-summary-delete': 'Delete role',
        'role-summary-description': 'Description',
        'role-summary-disable': 'Disable role',
        'role-summary-edit': 'Edit role',
        'role-summary-name': 'Identifier',
        'role-summary-reactivate': 'Reactivate role',
        'role-summary-save': 'Save role',
        'role-summary-title': 'Name',

        'role-tooltip-$count-others': (count) => {
            return (count === 1) ? `1 other` : `${count} others`;
        },

        'server-list-edit': 'Edit server list',
        'server-list-api-access-false': '',
        'server-list-api-access-true': 'Acquired',
        'server-list-add': 'Add new server',
        'server-list-title': 'Servers',
        'server-list-oauth-false': '',
        'server-list-oauth-true': 'Active',

        'server-summary-acquire': 'Acquire API access',
        'server-summary-api-access': 'API access',
        'server-summary-api-access-acquired': 'Administrative access acquired',
        'server-summary-api-access-not-applicable': 'Not applicable',
        'server-summary-api-access-pending': 'Waiting for user action',
        'server-summary-cancel': 'Cancel',
        'server-summary-delete': 'Delete server',
        'server-summary-edit': 'Edit server',
        'server-summary-member-$name': (name) => {
            return `Server: ${name}`;
        },
        'server-summary-name': 'Identifier',
        'server-summary-new-user': 'New users',
        'server-summary-new-user-no-creation': 'Do not create new users',
        'server-summary-new-user-guest': 'Create new users as guests',
        'server-summary-new-user-member': 'Create new users as team members',
        'server-summary-new-user-automatic-approval': 'Approve new users automatically',
        'server-summary-oauth-id': 'OAuth client ID',
        'server-summary-oauth-secret': 'OAuth client secret',
        'server-summary-oauth-url': 'OAuth URL',
        'server-summary-save': 'Save server',
        'server-summary-show-api-log': 'Show API log',
        'server-summary-test-oauth': 'Test OAuth integration',
        'server-summary-title': 'Name',
        'server-summary-type': 'Server type',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-gitlab': 'GitLab',
        'server-type-github': 'GitHub',
        'server-type-google': 'Google',

        'settings-background-image': 'Background image',
        'settings-cancel': 'Cancel',
        'settings-edit': 'Edit settings',
        'settings-input-languages': 'Input languages',
        'settings-push-relay': 'Push relay',
        'settings-save': 'Save settings',
        'settings-site-title': 'Site name',
        'settings-site-description': 'Description',
        'settings-site-address': 'Address',
        'settings-title': 'Settings',

        'sign-in-$title': (title) => {
            var text = `Sign in`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'sign-in-password': 'Password:',
        'sign-in-submit': 'Sign in',
        'sign-in-oauth': 'Sign in through OAuth',
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

        'text-field-placeholder-none': 'none',

        'tooltip-$first-and-$tooltip': (first, tooltip) => {
            return [ first, ' and ', tooltip ];
        },
        'tooltip-more': 'More',

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
        'user-list-add': 'Add new user',
        'user-list-reject-all': 'Reject all requests',
        'user-list-save': 'Save user list',
        'user-list-status-deleted': 'Deleted',
        'user-list-status-disabled': 'Account disabled',
        'user-list-status-pending': 'Approval pending',
        'user-list-title': 'Users',
        'user-list-type-admin': 'Administrator',
        'user-list-type-guest': 'Guest',
        'user-list-type-member': 'Team member',
        'user-summary-$name': (name) => {
            var text = 'User';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-cancel': 'Cancel',
        'user-summary-confirm-delete': 'Are you sure you want to delete this user account?',
        'user-summary-confirm-disable': 'Are you sure you want to disable this user account?',
        'user-summary-confirm-reactivate': 'Are you sure you want to reactivate this user account?',
        'user-summary-delete': 'Delete user account',
        'user-summary-disable': 'Disable user account',
        'user-summary-edit': 'Edit user',
        'user-summary-email': 'E-mail',
        'user-summary-member-$name': (name) => {
            var text = 'User';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-github': 'GitHub profile URL',
        'user-summary-gitlab': 'Gitlab profile URL',
        'user-summary-ichat': 'iChat user name',
        'user-summary-linkedin': 'Linkedin profile URL',
        'user-summary-member-edit': 'Edit member',
        'user-summary-member-save': 'Save member',
        'user-summary-name': 'Name',
        'user-summary-phone': 'Phone number',
        'user-summary-profile-image': 'Profile image',
        'user-summary-reactivate': 'Reactivate user account',
        'user-summary-roles': 'Roles',
        'user-summary-role-none': 'None',
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
        'user-summary-type-member': 'Team member',
        'user-summary-username': 'User name',
        'user-summary-visibility': 'Visibility',
        'user-summary-visibility-hidden': 'User is not shown in People section',
        'user-summary-visibility-shown': 'User is listed in People section',

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
        'validation-required-for-oauth': 'Required when OAuth is used',
    };
};
