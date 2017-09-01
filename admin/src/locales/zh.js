module.exports = function(languageCode) {
    return {
        'app-name': '電車吧',
        'app-title': '電車吧—管理控制台',

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
        'member-list-cancel': '取消',
        'member-list-edit': '更改成員名單',
        'member-list-new': '新成員',
        'member-list-save': '保存成員名單',
        'member-list-title': '成員',

        'nav-member-new': '新成員',
        'nav-members': '成員',
        'nav-projects': '項目',
        'nav-project-new': '新項目',
        'nav-repositories': '儲存庫',
        'nav-robots': '機器人',
        'nav-robot-new': '新機器人',
        'nav-roles': '角色',
        'nav-role-new': '新角色',
        'nav-servers': '服務器',
        'nav-server-new': '新服務器',
        'nav-settings': '設置',
        'nav-users': '用戶',
        'nav-user-new': '新用戶',

        'project-list-$title-with-$name': (title, name) => {
            if (title) {
                return `${title} 《${name}》`;
            } else {
                return name;
            }
        },
        'project-list-new': '新項目',
        'project-list-title': '項目',

        'repo-list-cancel': '取消',
        'repo-list-edit': '更改儲存庫名單',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': '啟用',
        'repo-list-save': '保存儲存庫名單',
        'repo-list-title': '儲存庫',

        'role-list-new': '新角色',
        'role-list-title': '角色',

        'role-summary-$title': (title) => {
            var text = '角色';
            if (title) {
                text += `：${title}`;
            }
            return text;
        },
        'role-summary-cancel': '取消',
        'role-summary-description': '描述',
        'role-summary-edit': '更改角色',
        'role-summary-name': 'URL Slug',
        'role-summary-save': '保存角色',
        'role-summary-title': '名稱',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-gitlab': 'GitLab',
        'server-type-github': 'GitHub',
        'server-type-google': 'Google',

        'table-heading-date-range': '活動期間',
        'table-heading-email': '電郵地址',
        'table-heading-issue-tracker': '錯誤追踪系統',
        'table-heading-last-modified': '最後修改日期',
        'table-heading-last-month': '上月',
        'table-heading-name': '姓名',
        'table-heading-projects': '項目',
        'table-heading-repositories': '儲存庫',
        'table-heading-roles': '角色',
        'table-heading-server': '服務器',
        'table-heading-this-month': '本月',
        'table-heading-title': '名稱',
        'table-heading-to-date': '至今',
        'table-heading-type': '類型',
        'table-heading-users': '用戶',

        'text-field-placeholder-none': '沒有提供',

        'user-list-$name-with-$username': (name, username) => {
            if (name) {
                if (username) {
                    return `${name}（${username}）`;
                } else {
                    return name;
                }
            } else {
                return username;
            }
        },
        'user-list-approve': '批准新用戶',
        'user-list-cancel': '取消',
        'user-list-new': '新用戶',
        'user-list-save': '批准用戶',
        'user-list-title': '用戶',
        'user-list-user-$type-$approved': (type, approved) => {
            var text;
            switch(type) {
                case 'guest':
                    text = '來客';
                    break;
                case 'member':
                    text = '僱員';
                    break;
                case 'admin':
                    text = '管理员';
                    break;
            }
            if (!approved) {
                text += '（未经批准）';
            }
            return text;
        },
    };
};
