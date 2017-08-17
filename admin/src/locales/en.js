module.exports = function(languageCode) {
    return {
        'app-name': 'Trambar',
        'app-title': 'Trambar - Administrative Console',

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
        'project-summary-edit': 'Edit Project',

        'project-list-new': 'New Project',
        'project-list-title': 'Projects',

        'project-member-list-edit': 'Edit Member List',
        'project-member-list-new': 'New Member',
        'project-member-list-title': 'Members',

        'role-list-new': 'New Role',
        'role-list-title': 'Roles',

        'server-list-new': 'New Service',
        'server-list-title': 'Services',

        'settings-edit': 'Edit Settings',
        'settings-title': 'Settings',

        'sign-in-password': 'Password:',
        'sign-in-submit': 'Sign in',
        'sign-in-title': 'Sign in',
        'sign-in-title-oauth': 'Sign in through OAuth',
        'sign-in-username': 'User name:',

        'table-heading-name': 'Name',
        'table-heading-identifier': 'Identifier',
        'table-heading-last-modified': 'Last modified',
        'table-heading-personal-name': 'Name',
        'table-heading-repositories': 'Repositories',
        'table-heading-title': 'Title',
        'table-heading-type': 'Type',
        'table-heading-username': 'User name',

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
    };
};
