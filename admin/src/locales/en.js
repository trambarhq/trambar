module.exports = function(languageCode) {
    return {
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
        'activity-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 task list` : `${count} task lists`;
        },
        'activity-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki edit` : `${count} wiki edits`;
        },

        'app-name': 'Trambar',
        'app-title': 'Trambar - Administrative Console',

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

        'nav-members': 'Members',
        'nav-projects': 'Projects',
        'nav-project-name-pending': '<project name>',
        'nav-repositories': 'Repositories',
        'nav-robots': 'Robots',
        'nav-roles': 'Roles',
        'nav-servers': 'Services',
        'nav-settings': 'Settings',
        'nav-users': 'Users',

        'project-summary-$title': (title) => {
            var text = 'Project';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'project-summary-cancel': 'Cancel',
        'project-summary-delete': 'Delete Project',
        'project-summary-description': 'Description',
        'project-summary-edit': 'Edit Project',
        'project-summary-name': 'URL Slug',
        'project-summary-save': 'Save Project',
        'project-summary-title': 'Name',

        'project-list-$title-with-$name': (title, name) => {
            if (title) {
                return `${title} (${name})`;
            } else {
                return name;
            }
        },
        'project-list-new': 'New Project',
        'project-list-title': 'Projects',

        'project-tooltip-$count-others': (count) => {
            return (count === 1) ? `1 other` : `${count} others`;
        },

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
        'member-list-edit': 'Edit Member List',
        'member-list-new': 'New Member',
        'member-list-title': 'Members',

        'repo-list-edit': 'Edit Repository List',
        'repo-list-title': 'Repositories',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': 'Enabled',

        'repo-summary-$title': (title) => {
            var text = `Repository`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'repo-summary-edit': 'Edit Repository',

        'repository-tooltip-$count': (count) => {
            return (count === 1) ? `1 repository` : `${count} repositories`;
        },

        'role-list-new': 'New Role',
        'role-list-title': 'Roles',

        'role-tooltip-$count-others': (count) => {
            return (count === 1) ? `1 other` : `${count} others`;
        },

        'server-list-new': 'New Service',
        'server-list-title': 'Services',

        'settings-edit': 'Edit Settings',
        'settings-title': 'Settings',

        'sign-in-password': 'Password:',
        'sign-in-submit': 'Sign in',
        'sign-in-title': 'Sign in',
        'sign-in-title-oauth': 'Sign in through OAuth',
        'sign-in-username': 'User name:',

        'table-heading-date-range': 'Active period',
        'table-heading-email': 'E-mail',
        'table-heading-identifier': 'Identifier',
        'table-heading-issue-tracker': 'Issue tracker',
        'table-heading-last-modified': 'Last modified',
        'table-heading-last-month': 'Last month',
        'table-heading-name': 'Name',
        'table-heading-projects': 'Projects',
        'table-heading-repositories': 'Repositories',
        'table-heading-roles': 'Roles',
        'table-heading-server': 'Server',
        'table-heading-this-month': 'This month',
        'table-heading-title': 'Name',
        'table-heading-to-date': 'To date',
        'table-heading-type': 'Type',
        'table-heading-users': 'Users',
        'table-heading-username': 'User name',

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
        'user-list-new': 'New User',
        'user-list-title': 'Users',

        'user-summary-$name': (name) => {
            var text = 'User';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-edit': 'Edit User',
        'user-summary-member-$name': (name) => {
            var text = 'User';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-member-edit': 'Edit Member',

        'user-tooltip-$count': (count) => {
            return (count === 1) ? `1 user` : `${count} users`;
        },
    };
};
