import 'moment/locale/en-au';
import 'moment/locale/en-ca';
import 'moment/locale/en-gb';
import 'moment/locale/en-ie';
import 'moment/locale/en-nz';
import { cardinal } from 'common/locale/grammars/english.mjs';

const phrases = {
    'action-badge-add': 'add',
    'action-badge-approve': 'approve',
    'action-badge-archive': 'archive',
    'action-badge-deselect': 'deselect',
    'action-badge-disable': 'disable',
    'action-badge-reactivate': 'reactivate',
    'action-badge-remove': 'remove',
    'action-badge-restore': 'restore',
    'action-badge-select': 'select',

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
    'activity-chart-legend-tag': 'Tags',
    'activity-chart-legend-task-list': 'Task lists',
    'activity-chart-legend-wiki': 'Wiki edits',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, '1 story', '2 stories');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 branch', '2 branches');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 issue', '2 issues');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, '1 membership change', '2 membership changes');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 merge', '2 merges');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 merge request', '2 merge requests');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 milestone', '2 milestones');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, '1 post', '2 posts');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, '1 push', '2 pushes');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 repository change', '2 repository changes');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 survey', '2 surveys');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 tag', '2 tags');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 task list', '2 task lists');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 wiki edit', '2 wiki edits');
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
    'member-list-edit': 'Edit member list',
    'member-list-reject-all': 'Reject all requests',
    'member-list-save': 'Save member list',
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
    'nav-spreadsheets': 'Excel files',
    'nav-user-new': 'New user',
    'nav-users': 'Users',
    'nav-website': 'Website',
    'nav-wikis': 'GitLab wikis',

    'project-list-add': 'Add new project',
    'project-list-cancel': 'Cancel',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'the selected project', 'these 2 projects');
        return `Are you sure you want to archive ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'the selected project', 'these 2 projects');
        return `Are you sure you want to restore ${projects}?`;
    },
    'project-list-edit': 'Edit project list',
    'project-list-save': 'Save project list',
    'project-list-status-archived': 'Archived',
    'project-list-status-deleted': 'Deleted',
    'project-list-title': 'Projects',

    'project-summary-$title': (title) => {
        let text = 'Project';
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
        return cardinal(count, '1 other', '2 others');
    },

    'repo-list-cancel': 'Cancel',
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, 'this repository', 'these 2 repositories');
        return `Are you sure you want to remove ${repositories} from the project?`;
    },
    'repo-list-edit': 'Edit repository list',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Enabled',
    'repo-list-save': 'Save repository list',
    'repo-list-title': 'Repositories',

    'repo-summary-$title': (title) => {
        let text = `Repository`;
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
        return cardinal(count, '1 repository', '2 repositories');
    },

    'role-list-add': 'Add new role',
    'role-list-cancel': 'Cancel',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'this role', 'these 2 roles');
        return `Are you sure you want to disable ${roles}?`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'this role', 'these 2 roles');
        return `Are you sure you want to reactivate ${roles}?`
    },
    'role-list-edit': 'Edit role list',
    'role-list-save': 'Save role list',
    'role-list-status-deleted': 'Deleted',
    'role-list-status-disabled': 'Disabled',
    'role-list-title': 'Roles',

    'role-summary-$title': (title) => {
        let text = 'Role';
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
        return cardinal(count, '1 other', '2 others');
    },

    'server-list-add': 'Add new server',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Acquired',
    'server-list-cancel': 'Cancel',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'this server', 'these 2 servers');
        return `Are you sure you want to disable ${servers}?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'this server', 'these 2 servers');
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
    'server-summary-oauth-deauthorize-callback-url': 'Deauthorize Callback URL',
    'server-summary-oauth-gitlab-url': 'GitLab URL',
    'server-summary-oauth-redirect-uri': 'Redirect URI',
    'server-summary-oauth-redirect-url': 'Redirect URL',
    'server-summary-oauth-site-url': 'Site URL',
    'server-summary-privacy-policy-url': 'Privacy policy URL',
    'server-summary-reactivate': 'Reactivate server',
    'server-summary-return': 'Return to server list',
    'server-summary-role-none': 'Do not assign any roles to new users',
    'server-summary-roles': 'Role assignment',
    'server-summary-save': 'Save server',
    'server-summary-system-address-missing': 'System address has not been set',
    'server-summary-terms-and-conditions-url': 'Terms and conditions URL',
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
    'server-summary-whitelist': 'E-mail address whitelist',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': 'Background image',
    'settings-cancel': 'Cancel',
    'settings-company-name': 'Company name',
    'settings-edit': 'Edit settings',
    'settings-input-languages': 'Input languages',
    'settings-push-relay': 'Push relay',
    'settings-save': 'Save settings',
    'settings-site-address': 'Address',
    'settings-site-description': 'Description',
    'settings-site-title': 'Site name',
    'settings-title': 'Settings',

    'sign-in-$title': (title) => {
        let text = `Sign in`;
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

    'spreadsheet-list-add': 'Add new link',
    'spreadsheet-list-cancel': 'Cancel',
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, 'this link', 'these 2 links');
        return `Are you sure you want to disable ${spreadsheets}?`
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, 'this link', 'these 2 links');
        return `Are you sure you want to reactivate ${spreadsheets}?`
    },
    'spreadsheet-list-edit': 'Edit link list',
    'spreadsheet-list-save': 'Save link list',
    'spreadsheet-list-status-deleted': 'Deleted',
    'spreadsheet-list-status-disabled': 'Disabled',
    'spreadsheet-list-title': 'Excel files',

    'spreadsheet-summary-$title': (title) => {
        let text = 'Excel file';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': 'Add new link',
    'spreadsheet-summary-cancel': 'Cancel',
    'spreadsheet-summary-confirm-delete': 'Are you sure you want to delete this link?',
    'spreadsheet-summary-confirm-disable': 'Are you sure you want to disable this link?',
    'spreadsheet-summary-confirm-reactivate': 'Are you sure you want to reactivate this link?',
    'spreadsheet-summary-delete': 'Delete link',
    'spreadsheet-summary-description': 'Description',
    'spreadsheet-summary-disable': 'Disable link',
    'spreadsheet-summary-edit': 'Edit link',
    'spreadsheet-summary-filename': 'Filename',
    'spreadsheet-summary-name': 'Identifier',
    'spreadsheet-summary-reactivate': 'Reactivate link',
    'spreadsheet-summary-return': 'Return to link list',
    'spreadsheet-summary-save': 'Save link',
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `Sheet ${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': 'Title',
    'spreadsheet-summary-url': 'URL',

    'table-heading-api-access': 'API access﻿',
    'table-heading-date-range': 'Active period',
    'table-heading-email': 'E-mail',
    'table-heading-filename': 'Filename',
    'table-heading-issue-tracker': 'Issue tracker',
    'table-heading-last-modified': 'Last modified',
    'table-heading-last-month': 'Last month',
    'table-heading-name': 'Name',
    'table-heading-oauth': 'OAuth authentication',
    'table-heading-projects': 'Projects',
    'table-heading-public': 'Public',
    'table-heading-repositories': 'Repositories',
    'table-heading-roles': 'Roles',
    'table-heading-repo': 'Repository',
    'table-heading-server': 'Server',
    'table-heading-sheets': 'Sheets',
    'table-heading-slug': 'Slug',
    'table-heading-this-month': 'This month',
    'table-heading-title': 'Name',
    'table-heading-to-date': 'To date',
    'table-heading-type': 'Type',
    'table-heading-url': 'URL',
    'table-heading-username': 'User name',
    'table-heading-users': 'Users',

    'task-$seconds': (seconds) => {
        return (seconds === 1) ? `1 second` : `${seconds} seconds`;
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 commit comment', '2 commit comments');
        return `Imported ${comments} from “${repo}”`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, '1 event', '2 events');
        return `Imported ${events} from “${repo}”`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 issue comment', '2 issue comments');
        return `Imported ${comments} from “${repo}”`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 merge-request comment', '2 merge-request comments');
        return `Imported ${comments} from “${repo}”`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, '1 repository', '2 repositories');
        return `Imported ${repos}`;
    },
    'task-imported-$count-users': (count) => {
        let users = cardinal(count, '1 user', '2 users');
        return `Imported ${users}`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, '1 commit', '2 commits');
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
        let hooks = cardinal(count, '1 hook', '2 hooks');
        return `Installed ${hooks}`;
    },
    'task-installing-hooks': 'Installing hooks',
    'task-removed-$count-hooks': (count) => {
        let hooks = cardinal(count, '1 hook', '2 hooks');
        return `Uninstalled ${hooks}`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, '1 repository', '2 repositories');
        return `Removed ${repos}`;
    },
    'task-removed-$count-users': (count) => {
        let users = cardinal(count, '1 user', '2 users');
        return `Removed ${users}`;
    },
    'task-removing-hooks': 'Uninstalling hooks',
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, '1 repository', '2 repositories');
        return `Updated ${repos}`;
    },
    'task-updated-$count-users': (count) => {
        let users = cardinal(count, '1 user', '2 users');
        return `Updated ${users}`;
    },

    'text-field-placeholder-none': 'none',

    'tz-name-abidjan': 'Abidjan',
    'tz-name-accra': 'Accra',
    'tz-name-acre': 'Acre',
    'tz-name-act': 'Australian Capital Territory',
    'tz-name-adak': 'Adak',
    'tz-name-addis-ababa': 'Addis Ababa',
    'tz-name-adelaide': 'Adelaide',
    'tz-name-aden': 'Aden',
    'tz-name-africa': 'Africa',
    'tz-name-alaska': 'Alaska',
    'tz-name-aleutian': 'Aleutian',
    'tz-name-algiers': 'Algiers',
    'tz-name-almaty': 'Almaty',
    'tz-name-america': 'America',
    'tz-name-amman': 'Amman',
    'tz-name-amsterdam': 'Amsterdam',
    'tz-name-anadyr': 'Anadyr',
    'tz-name-anchorage': 'Anchorage',
    'tz-name-andorra': 'Andorra',
    'tz-name-anguilla': 'Anguilla',
    'tz-name-antananarivo': 'Antananarivo',
    'tz-name-antarctica': 'Antarctica',
    'tz-name-antigua': 'Antigua',
    'tz-name-apia': 'Apia',
    'tz-name-aqtau': 'Aqtau',
    'tz-name-aqtobe': 'Aqtobe',
    'tz-name-araguaina': 'Araguaina',
    'tz-name-arctic': 'Arctic',
    'tz-name-argentina': 'Argentina',
    'tz-name-arizona': 'Arizona',
    'tz-name-aruba': 'Aruba',
    'tz-name-ashgabat': 'Ashgabat',
    'tz-name-ashkhabad': 'Ashkhabad',
    'tz-name-asia': 'Asia',
    'tz-name-asmara': 'Asmara',
    'tz-name-asmera': 'Asmera',
    'tz-name-astrakhan': 'Astrakhan',
    'tz-name-asuncion': 'Asuncion',
    'tz-name-athens': 'Athens',
    'tz-name-atikokan': 'Atikokan',
    'tz-name-atka': 'Atka',
    'tz-name-atlantic': 'Atlantic',
    'tz-name-atyrau': 'Atyrau',
    'tz-name-auckland': 'Auckland',
    'tz-name-australia': 'Australia',
    'tz-name-azores': 'Azores',
    'tz-name-baghdad': 'Baghdad',
    'tz-name-bahia': 'Bahia',
    'tz-name-bahia-banderas': 'Bahia Banderas',
    'tz-name-bahrain': 'Bahrain',
    'tz-name-baja-norte': 'Baja Norte',
    'tz-name-baja-sur': 'Baja Sur',
    'tz-name-baku': 'Baku',
    'tz-name-bamako': 'Bamako',
    'tz-name-bangkok': 'Bangkok',
    'tz-name-bangui': 'Bangui',
    'tz-name-banjul': 'Banjul',
    'tz-name-barbados': 'Barbados',
    'tz-name-barnaul': 'Barnaul',
    'tz-name-beirut': 'Beirut',
    'tz-name-belem': 'Belem',
    'tz-name-belfast': 'Belfast',
    'tz-name-belgrade': 'Belgrade',
    'tz-name-belize': 'Belize',
    'tz-name-berlin': 'Berlin',
    'tz-name-bermuda': 'Bermuda',
    'tz-name-beulah': 'Beulah',
    'tz-name-bishkek': 'Bishkek',
    'tz-name-bissau': 'Bissau',
    'tz-name-blanc-sablon': 'Blanc-Sablon',
    'tz-name-blantyre': 'Blantyre',
    'tz-name-boa-vista': 'Boa Vista',
    'tz-name-bogota': 'Bogota',
    'tz-name-boise': 'Boise',
    'tz-name-bougainville': 'Bougainville',
    'tz-name-bratislava': 'Bratislava',
    'tz-name-brazil': 'Brazil',
    'tz-name-brazzaville': 'Brazzaville',
    'tz-name-brisbane': 'Brisbane',
    'tz-name-broken-hill': 'Broken Hill',
    'tz-name-brunei': 'Brunei',
    'tz-name-brussels': 'Brussels',
    'tz-name-bucharest': 'Bucharest',
    'tz-name-budapest': 'Budapest',
    'tz-name-buenos-aires': 'Buenos Aires',
    'tz-name-bujumbura': 'Bujumbura',
    'tz-name-busingen': 'Busingen',
    'tz-name-cairo': 'Cairo',
    'tz-name-calcutta': 'Calcutta',
    'tz-name-cambridge-bay': 'Cambridge Bay',
    'tz-name-campo-grande': 'Campo Grande',
    'tz-name-canada': 'Canada',
    'tz-name-canary': 'Canary Islands',
    'tz-name-canberra': 'Canberra',
    'tz-name-cancun': 'Cancun',
    'tz-name-cape-verde': 'Cape Verde',
    'tz-name-caracas': 'Caracas',
    'tz-name-casablanca': 'Casablanca',
    'tz-name-casey': 'Casey',
    'tz-name-catamarca': 'Catamarca',
    'tz-name-cayenne': 'Cayenne',
    'tz-name-cayman': 'Cayman',
    'tz-name-center': 'Center',
    'tz-name-central': 'Central',
    'tz-name-ceuta': 'Ceuta',
    'tz-name-chagos': 'Chagos',
    'tz-name-chatham': 'Chatham',
    'tz-name-chicago': 'Chicago',
    'tz-name-chihuahua': 'Chihuahua',
    'tz-name-chile': 'Chile',
    'tz-name-chisinau': 'Chisinau',
    'tz-name-chita': 'Chita',
    'tz-name-choibalsan': 'Choibalsan',
    'tz-name-chongqing': 'Chongqing',
    'tz-name-christmas': 'Christmas island',
    'tz-name-chungking': 'Chongqing',
    'tz-name-chuuk': 'Chuuk',
    'tz-name-cocos': 'Cocos Islands',
    'tz-name-colombo': 'Colombo',
    'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
    'tz-name-comoro': 'Comoro',
    'tz-name-conakry': 'Conakry',
    'tz-name-continental': 'Continental',
    'tz-name-copenhagen': 'Copenhagen',
    'tz-name-coral-harbour': 'Coral Harbour',
    'tz-name-cordoba': 'Cordoba',
    'tz-name-costa-rica': 'Costa Rica',
    'tz-name-creston': 'Creston',
    'tz-name-cuiaba': 'Cuiaba',
    'tz-name-curacao': 'Curacao',
    'tz-name-currie': 'Currie',
    'tz-name-dacca': 'Dacca',
    'tz-name-dakar': 'Dakar',
    'tz-name-damascus': 'Damascus',
    'tz-name-danmarkshavn': 'Danmarkshavn',
    'tz-name-dar-es-salaam': 'Dar es Salaam',
    'tz-name-darwin': 'Darwin',
    'tz-name-davis': 'Davis',
    'tz-name-dawson': 'Dawson',
    'tz-name-dawson-creek': 'Dawson Creek',
    'tz-name-de-noronha': 'De Noronha',
    'tz-name-denver': 'Denver',
    'tz-name-detroit': 'Detroit',
    'tz-name-dhaka': 'Dhaka',
    'tz-name-dili': 'Dili',
    'tz-name-djibouti': 'Djibouti',
    'tz-name-dominica': 'Dominica',
    'tz-name-douala': 'Douala',
    'tz-name-dubai': 'Dubai',
    'tz-name-dublin': 'Dublin',
    'tz-name-dumont-d-urville': 'Dumont d’Urville',
    'tz-name-dushanbe': 'Dushanbe',
    'tz-name-east': 'East',
    'tz-name-east-indiana': 'East Indiana',
    'tz-name-easter': 'Easter Island',
    'tz-name-easter-island': 'Easter Island',
    'tz-name-eastern': 'Eastern',
    'tz-name-edmonton': 'Edmonton',
    'tz-name-efate': 'Efate',
    'tz-name-eirunepe': 'Eirunepe',
    'tz-name-el-aaiun': 'El Aaiun',
    'tz-name-el-salvador': 'El Salvador',
    'tz-name-enderbury': 'Enderbury',
    'tz-name-ensenada': 'Ensenada',
    'tz-name-eucla': 'Eucla',
    'tz-name-europe': 'Europe',
    'tz-name-faeroe': 'Faeroe Islands',
    'tz-name-fakaofo': 'Fakaofo',
    'tz-name-famagusta': 'Famagusta',
    'tz-name-faroe': 'Faroe',
    'tz-name-fiji': 'Fiji',
    'tz-name-fort-nelson': 'Fort Nelson',
    'tz-name-fort-wayne': 'Fort Wayne',
    'tz-name-fortaleza': 'Fortaleza',
    'tz-name-freetown': 'Freetown',
    'tz-name-funafuti': 'Funafuti',
    'tz-name-gaborone': 'Gaborone',
    'tz-name-galapagos': 'Galapagos',
    'tz-name-gambier': 'Gambier',
    'tz-name-gaza': 'Gaza',
    'tz-name-general': 'General',
    'tz-name-gibraltar': 'Gibraltar',
    'tz-name-glace-bay': 'Glace Bay',
    'tz-name-godthab': 'Godthab',
    'tz-name-goose-bay': 'Goose Bay',
    'tz-name-grand-turk': 'Grand Turk',
    'tz-name-grenada': 'Grenada',
    'tz-name-guadalcanal': 'Guadalcanal',
    'tz-name-guadeloupe': 'Guadeloupe',
    'tz-name-guam': 'Guam',
    'tz-name-guatemala': 'Guatemala',
    'tz-name-guayaquil': 'Guayaquil',
    'tz-name-guernsey': 'Guernsey',
    'tz-name-guyana': 'Guyana',
    'tz-name-halifax': 'Halifax',
    'tz-name-harare': 'Harare',
    'tz-name-harbin': 'Harbin',
    'tz-name-havana': 'Havana',
    'tz-name-hawaii': 'Hawaii',
    'tz-name-hebron': 'Hebron',
    'tz-name-helsinki': 'Helsinki',
    'tz-name-hermosillo': 'Hermosillo',
    'tz-name-ho-chi-minh': 'Ho Chi Minh',
    'tz-name-hobart': 'Hobart',
    'tz-name-hong-kong': 'Hong Kong',
    'tz-name-honolulu': 'Honolulu',
    'tz-name-hovd': 'Hovd',
    'tz-name-indian': 'Indian Ocean',
    'tz-name-indiana': 'Indiana',
    'tz-name-indiana-starke': 'Indiana-Starke',
    'tz-name-indianapolis': 'Indianapolis',
    'tz-name-inuvik': 'Inuvik',
    'tz-name-iqaluit': 'Iqaluit',
    'tz-name-irkutsk': 'Irkutsk',
    'tz-name-isle-of-man': 'Isle of Man',
    'tz-name-istanbul': 'Istanbul',
    'tz-name-jakarta': 'Jakarta',
    'tz-name-jamaica': 'Jamaica',
    'tz-name-jan-mayen': 'Jan Mayen',
    'tz-name-jayapura': 'Jayapura',
    'tz-name-jersey': 'Jersey',
    'tz-name-jerusalem': 'Jerusalem',
    'tz-name-johannesburg': 'Johannesburg',
    'tz-name-johnston': 'Johnston',
    'tz-name-juba': 'Juba',
    'tz-name-jujuy': 'Jujuy',
    'tz-name-juneau': 'Juneau',
    'tz-name-kabul': 'Kabul',
    'tz-name-kaliningrad': 'Kaliningrad',
    'tz-name-kamchatka': 'Kamchatka',
    'tz-name-kampala': 'Kampala',
    'tz-name-karachi': 'Karachi',
    'tz-name-kashgar': 'Kashgar',
    'tz-name-kathmandu': 'Kathmandu',
    'tz-name-katmandu': 'Katmandu',
    'tz-name-kentucky': 'Kentucky',
    'tz-name-kerguelen': 'Kerguelen',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': 'Khartoum',
    'tz-name-kiev': 'Kiev',
    'tz-name-kigali': 'Kigali',
    'tz-name-kinshasa': 'Kinshasa',
    'tz-name-kiritimati': 'Kiritimati',
    'tz-name-kirov': 'Kirov',
    'tz-name-knox': 'Knox',
    'tz-name-knox-in': 'Knox, Indiana',
    'tz-name-kolkata': 'Kolkata',
    'tz-name-kosrae': 'Kosrae',
    'tz-name-kralendijk': 'Kralendijk',
    'tz-name-krasnoyarsk': 'Krasnoyarsk',
    'tz-name-kuala-lumpur': 'Kuala Lumpur',
    'tz-name-kuching': 'Kuching',
    'tz-name-kuwait': 'Kuwait',
    'tz-name-kwajalein': 'Kwajalein',
    'tz-name-la-paz': 'La Paz',
    'tz-name-la-rioja': 'La Rioja',
    'tz-name-lagos': 'Lagos',
    'tz-name-lhi': 'Lord Howe Island',
    'tz-name-libreville': 'Libreville',
    'tz-name-lima': 'Lima',
    'tz-name-lindeman': 'Lindeman',
    'tz-name-lisbon': 'Lisbon',
    'tz-name-ljubljana': 'Ljubljana',
    'tz-name-lome': 'Lome',
    'tz-name-london': 'London',
    'tz-name-longyearbyen': 'Longyearbyen',
    'tz-name-lord-howe': 'Lord Howe',
    'tz-name-los-angeles': 'Los Angeles',
    'tz-name-louisville': 'Louisville',
    'tz-name-lower-princes': 'Lower Prince’s Quarter ',
    'tz-name-luanda': 'Luanda',
    'tz-name-lubumbashi': 'Lubumbashi',
    'tz-name-lusaka': 'Lusaka',
    'tz-name-luxembourg': 'Luxembourg',
    'tz-name-macao': 'Macao',
    'tz-name-macau': 'Macau',
    'tz-name-maceio': 'Maceio',
    'tz-name-macquarie': 'Macquarie',
    'tz-name-madeira': 'Madeira',
    'tz-name-madrid': 'Madrid',
    'tz-name-magadan': 'Magadan',
    'tz-name-mahe': 'Mahe',
    'tz-name-majuro': 'Majuro',
    'tz-name-makassar': 'Makassar',
    'tz-name-malabo': 'Malabo',
    'tz-name-maldives': 'Maldives',
    'tz-name-malta': 'Malta',
    'tz-name-managua': 'Managua',
    'tz-name-manaus': 'Manaus',
    'tz-name-manila': 'Manila',
    'tz-name-maputo': 'Maputo',
    'tz-name-marengo': 'Marengo',
    'tz-name-mariehamn': 'Mariehamn',
    'tz-name-marigot': 'Marigot',
    'tz-name-marquesas': 'Marquesas',
    'tz-name-martinique': 'Martinique',
    'tz-name-maseru': 'Maseru',
    'tz-name-matamoros': 'Matamoros',
    'tz-name-mauritius': 'Mauritius',
    'tz-name-mawson': 'Mawson',
    'tz-name-mayotte': 'Mayotte',
    'tz-name-mazatlan': 'Mazatlan',
    'tz-name-mbabane': 'Mbabane',
    'tz-name-mc-murdo': 'McMurdo',
    'tz-name-melbourne': 'Melbourne',
    'tz-name-mendoza': 'Mendoza',
    'tz-name-menominee': 'Menominee',
    'tz-name-merida': 'Merida',
    'tz-name-metlakatla': 'Metlakatla',
    'tz-name-mexico': 'Mexico',
    'tz-name-mexico-city': 'Mexico City',
    'tz-name-michigan': 'Michigan',
    'tz-name-midway': 'Midway',
    'tz-name-minsk': 'Minsk',
    'tz-name-miquelon': 'Miquelon',
    'tz-name-mogadishu': 'Mogadishu',
    'tz-name-monaco': 'Monaco',
    'tz-name-moncton': 'Moncton',
    'tz-name-monrovia': 'Monrovia',
    'tz-name-monterrey': 'Monterrey',
    'tz-name-montevideo': 'Montevideo',
    'tz-name-monticello': 'Monticello',
    'tz-name-montreal': 'Montreal',
    'tz-name-montserrat': 'Montserrat',
    'tz-name-moscow': 'Moscow',
    'tz-name-mountain': 'Mountain',
    'tz-name-muscat': 'Muscat',
    'tz-name-nairobi': 'Nairobi',
    'tz-name-nassau': 'Nassau',
    'tz-name-nauru': 'Nauru',
    'tz-name-ndjamena': 'Ndjamena',
    'tz-name-new-salem': 'New Salem',
    'tz-name-new-york': 'New York',
    'tz-name-newfoundland': 'Newfoundland',
    'tz-name-niamey': 'Niamey',
    'tz-name-nicosia': 'Nicosia',
    'tz-name-nipigon': 'Nipigon',
    'tz-name-niue': 'Niue',
    'tz-name-nome': 'Nome',
    'tz-name-norfolk': 'Norfolk',
    'tz-name-noronha': 'Noronha',
    'tz-name-north': 'North',
    'tz-name-north-dakota': 'North Dakota',
    'tz-name-nouakchott': 'Nouakchott',
    'tz-name-noumea': 'Noumea',
    'tz-name-novokuznetsk': 'Novokuznetsk',
    'tz-name-novosibirsk': 'Novosibirsk',
    'tz-name-nsw': 'New South Wales',
    'tz-name-ojinaga': 'Ojinaga',
    'tz-name-omsk': 'Omsk',
    'tz-name-oral': 'Oral',
    'tz-name-oslo': 'Oslo',
    'tz-name-ouagadougou': 'Ouagadougou',
    'tz-name-pacific': 'Pacific',
    'tz-name-pacific-new': 'Pacific-New',
    'tz-name-pago-pago': 'Pago Pago',
    'tz-name-palau': 'Palau',
    'tz-name-palmer': 'Palmer',
    'tz-name-panama': 'Panama',
    'tz-name-pangnirtung': 'Pangnirtung',
    'tz-name-paramaribo': 'Paramaribo',
    'tz-name-paris': 'Paris',
    'tz-name-perth': 'Perth',
    'tz-name-petersburg': 'Petersburg',
    'tz-name-phnom-penh': 'Phnom Penh',
    'tz-name-phoenix': 'Phoenix',
    'tz-name-pitcairn': 'Pitcairn',
    'tz-name-podgorica': 'Podgorica',
    'tz-name-pohnpei': 'Pohnpei',
    'tz-name-ponape': 'Ponape',
    'tz-name-pontianak': 'Pontianak',
    'tz-name-port-au-prince': 'Port-au-Prince',
    'tz-name-port-moresby': 'Port Moresby',
    'tz-name-port-of-spain': 'Port of Spain',
    'tz-name-porto-acre': 'Porto Acre',
    'tz-name-porto-novo': 'Porto-Novo',
    'tz-name-porto-velho': 'Porto Velho',
    'tz-name-prague': 'Prague',
    'tz-name-puerto-rico': 'Puerto Rico',
    'tz-name-punta-arenas': 'Punta Arenas',
    'tz-name-pyongyang': 'Pyongyang',
    'tz-name-qatar': 'Qatar',
    'tz-name-qostanay': 'Qostanay',
    'tz-name-queensland': 'Queensland',
    'tz-name-qyzylorda': 'Qyzylorda',
    'tz-name-rainy-river': 'Rainy River',
    'tz-name-rangoon': 'Rangoon',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': 'Rarotonga',
    'tz-name-recife': 'Recife',
    'tz-name-regina': 'Regina',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': 'Réunion',
    'tz-name-reykjavik': 'Reykjavik',
    'tz-name-riga': 'Riga',
    'tz-name-rio-branco': 'Rio Branco',
    'tz-name-rio-gallegos': 'Rio Gallegos',
    'tz-name-riyadh': 'Riyadh',
    'tz-name-rome': 'Rome',
    'tz-name-rosario': 'Rosario',
    'tz-name-rothera': 'Rothera',
    'tz-name-saigon': 'Saigon',
    'tz-name-saipan': 'Saipan',
    'tz-name-sakhalin': 'Sakhalin',
    'tz-name-salta': 'Salta',
    'tz-name-samara': 'Samara',
    'tz-name-samarkand': 'Samarkand',
    'tz-name-samoa': 'Samoa',
    'tz-name-san-juan': 'San Juan',
    'tz-name-san-luis': 'San Luis',
    'tz-name-san-marino': 'San Marino',
    'tz-name-santa-isabel': 'Santa Isabel',
    'tz-name-santarem': 'Santarem',
    'tz-name-santiago': 'Santiago',
    'tz-name-santo-domingo': 'Santo Domingo',
    'tz-name-sao-paulo': 'Sao Paulo',
    'tz-name-sao-tome': 'Sao Tome',
    'tz-name-sarajevo': 'Sarajevo',
    'tz-name-saratov': 'Saratov',
    'tz-name-saskatchewan': 'Saskatchewan',
    'tz-name-scoresbysund': 'Scoresbysund',
    'tz-name-seoul': 'Seoul',
    'tz-name-shanghai': 'Shanghai',
    'tz-name-shiprock': 'Shiprock',
    'tz-name-simferopol': 'Simferopol',
    'tz-name-singapore': 'Singapore',
    'tz-name-sitka': 'Sitka',
    'tz-name-skopje': 'Skopje',
    'tz-name-sofia': 'Sofia',
    'tz-name-south': 'South',
    'tz-name-south-georgia': 'South Georgia',
    'tz-name-south-pole': 'South Pole',
    'tz-name-srednekolymsk': 'Srednekolymsk',
    'tz-name-st-barthelemy': 'St Barthelemy',
    'tz-name-st-helena': 'St Helena',
    'tz-name-st-johns': 'St Johns',
    'tz-name-st-kitts': 'St Kitts',
    'tz-name-st-lucia': 'St Lucia',
    'tz-name-st-thomas': 'St Thomas',
    'tz-name-st-vincent': 'St Vincent',
    'tz-name-stanley': 'Stanley',
    'tz-name-stockholm': 'Stockholm',
    'tz-name-swift-current': 'Swift Current',
    'tz-name-sydney': 'Sydney',
    'tz-name-syowa': 'Syowa',
    'tz-name-tahiti': 'Tahiti',
    'tz-name-taipei': 'Taipei',
    'tz-name-tallinn': 'Tallinn',
    'tz-name-tarawa': 'Tarawa',
    'tz-name-tashkent': 'Tashkent',
    'tz-name-tasmania': 'Tasmania',
    'tz-name-tbilisi': 'Tbilisi',
    'tz-name-tegucigalpa': 'Tegucigalpa',
    'tz-name-tehran': 'Tehran',
    'tz-name-tel-aviv': 'Tel Aviv',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': 'Thimbu',
    'tz-name-thimphu': 'Thimphu',
    'tz-name-thule': 'Thule',
    'tz-name-thunder-bay': 'Thunder Bay',
    'tz-name-tijuana': 'Tijuana',
    'tz-name-timbuktu': 'Timbuktu',
    'tz-name-tirane': 'Tirane',
    'tz-name-tiraspol': 'Tiraspol',
    'tz-name-tokyo': 'Tokyo',
    'tz-name-tomsk': 'Tomsk',
    'tz-name-tongatapu': 'Tongatapu',
    'tz-name-toronto': 'Toronto',
    'tz-name-tortola': 'Tortola',
    'tz-name-tripoli': 'Tripoli',
    'tz-name-troll': 'Troll',
    'tz-name-truk': 'Truk',
    'tz-name-tucuman': 'Tucuman',
    'tz-name-tunis': 'Tunis',
    'tz-name-ujung-pandang': 'Ujung Pandang',
    'tz-name-ulaanbaatar': 'Ulaanbaatar',
    'tz-name-ulan-bator': 'Ulan Bator',
    'tz-name-ulyanovsk': 'Ulyanovsk',
    'tz-name-urumqi': 'Urumqi',
    'tz-name-us': 'United States',
    'tz-name-ushuaia': 'Ushuaia',
    'tz-name-ust-nera': 'Ust-Nera',
    'tz-name-uzhgorod': 'Uzhgorod',
    'tz-name-vaduz': 'Vaduz',
    'tz-name-vancouver': 'Vancouver',
    'tz-name-vatican': 'Vatican',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': 'Victoria',
    'tz-name-vienna': 'Vienna',
    'tz-name-vientiane': 'Vientiane',
    'tz-name-vilnius': 'Vilnius',
    'tz-name-vincennes': 'Vincennes',
    'tz-name-virgin': 'Virgin Islands',
    'tz-name-vladivostok': 'Vladivostok',
    'tz-name-volgograd': 'Volgograd',
    'tz-name-vostok': 'Vostok',
    'tz-name-wake': 'Wake Island',
    'tz-name-wallis': 'Wallis',
    'tz-name-warsaw': 'Warsaw',
    'tz-name-west': 'West',
    'tz-name-whitehorse': 'Whitehorse',
    'tz-name-winamac': 'Winamac',
    'tz-name-windhoek': 'Windhoek',
    'tz-name-winnipeg': 'Winnipeg',
    'tz-name-yakutat': 'Yakutat',
    'tz-name-yakutsk': 'Yakutsk',
    'tz-name-yancowinna': 'Yancowinna',
    'tz-name-yangon': 'Yangon',
    'tz-name-yap': 'Yap',
    'tz-name-yekaterinburg': 'Yekaterinburg',
    'tz-name-yellowknife': 'Yellowknife',
    'tz-name-yerevan': 'Yerevan',
    'tz-name-yukon': 'Yukon',
    'tz-name-zagreb': 'Zagreb',
    'tz-name-zaporozhye': 'Zaporozhye',
    'tz-name-zurich': 'Zurich',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' and ', tooltip ];
    },
    'tooltip-more': 'More',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 file', '2 files');
        return `Uploading ${files}, ${size} remaining`;
    },

    'user-list-add': 'Add new user',
    'user-list-approve-all': 'Approve all requests',
    'user-list-cancel': 'Cancel',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'this user account', 'these 2 user accounts');
        return `Are you sure you want to disable ${accounts}?`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'this user account', 'these 2 user accounts');
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
        let text = 'User';
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
        let text = 'Member';
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
    'user-summary-remove-membership': 'Remove user from project',
    'user-summary-restore-membership': 'Add user back to project',
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
        return cardinal(count, '1 user', '2 users');
    },

    'validation-duplicate-project-name': 'A project with that identifier already exists',
    'validation-duplicate-role-name': 'A role with that identifier already exists',
    'validation-duplicate-server-name': 'A server with that identifier already exists',
    'validation-duplicate-user-name': 'A user with that name already exists',
    'validation-illegal-project-name': 'Project identifier cannot be "global", "admin", "public", or "srv"',
    'validation-invalid-timezone': 'Invalid time zone',
    'validation-localhost-is-wrong': '"localhost" is not valid',
    'validation-password-for-admin-only': 'Only administrators can sign in using password',
    'validation-required': 'Required',
    'validation-used-by-trambar': 'Used by Trambar',

    'website-summary-cancel': 'Cancel',
    'website-summary-domain-names': 'Domain names',
    'website-summary-edit': 'Edit website',
    'website-summary-save': 'Save website',
    'website-summary-template': 'Template',
    'website-summary-template-disabled': 'Disabled',
    'website-summary-template-generic': 'Generic template',
    'website-summary-timezone': 'Time zone',
    'website-summary-title': 'Website',
    'website-summary-traiffic-report-time': 'Traffic report publication time',

    'welcome': 'Welcome!',

    'wiki-list-cancel': 'Cancel',
    'wiki-list-confirm-select-$count': (count) => {
        let wikis = cardinal(count, 'this wiki', 'these 2 wikis');
        return `Are you sure you want to make ${wikis} public?`
    },
    'wiki-list-confirm-deselect-$count': (count) => {
        let wikis = cardinal(count, 'this wiki', 'these 2 wikis');
        return `Are you sure you want to deselect ${wikis}?`
    },
    'wiki-list-edit': 'Edit wiki list',
    'wiki-list-public-always': 'always',
    'wiki-list-public-no': 'no',
    'wiki-list-public-referenced': 'referenced',
    'wiki-list-save': 'Save wiki list',
    'wiki-list-title': 'GitLab wikis',

    'wiki-summary-$title': (title) => {
        let text = 'GitLab wiki';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': 'Cancel',
    'wiki-summary-confirm-select': 'Are you sure you want to make this wiki public?',
    'wiki-summary-confirm-deselect': 'Are you sure you want to deselect this wiki?',
    'wiki-summary-edit': 'Edit wiki',
    'wiki-summary-page-contents': 'Contents',
    'wiki-summary-public': 'Public',
    'wiki-summary-public-always': 'Always',
    'wiki-summary-public-no': 'No',
    'wiki-summary-public-referenced': 'Yes (referenced by another public page)',
    'wiki-summary-repo': 'Repository identifier',
    'wiki-summary-return': 'Return to wiki list',
    'wiki-summary-slug': 'Slug',
    'wiki-summary-title': 'Title',
};

export {
    phrases,
};
