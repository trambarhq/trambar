require('moment/locale/zh-cn');
require('moment/locale/zh-hk');

module.exports = function(localeCode) {
    return {
        'app-name': '電車吧',
        'app-title': '電車吧—管理控制台',

        'confirmation-cancel': '取消',
        'confirmation-confirm': '接受',
        'confirmation-data-loss': '你確定要放棄你所做的更改嗎？',

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

        'repository-tooltip-$count': (count) => {
            var num = cardinal(count);
            return `${num}個儲存庫`;
        },

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

        'server-list-new': '新服務器',
        'server-list-title': '服務器',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-gitlab': 'GitLab',
        'server-type-github': 'GitHub',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-cancel': '取消',
        'settings-edit': '更改設置',
        'settings-input-languages': '輸入語言',
        'settings-save': '保存設置',
        'settings-site-title': '系統名稱',
        'settings-site-description': '描述',
        'settings-site-domain-name': '域名',
        'settings-title': '設置',

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

        'user-summary-$name': (name) => {
            var text = '用戶';
            if (name) {
                text += `：${name}`;
            }
            return text;
        },
        'user-summary-auth-server': '認證服務器',
        'user-summary-auth-server-none': '沒有',
        'user-summary-cancel': '取消',
        'user-summary-edit': '更改用戶',
        'user-summary-email': '電郵地址',
        'user-summary-member-$name': (name) => {
            var text = '成員';
            if (name) {
                text += `：${name}`;
            }
            return text;
        },
        'user-summary-github': 'GitHub用戶名',
        'user-summary-ichat': 'iChat用戶名',
        'user-summary-linkedin': 'Linkedin用戶名',
        'user-summary-member-edit': '更改成員',
        'user-summary-member-save': '保存成員',
        'user-summary-name': '姓名',
        'user-summary-phone': '電話號碼',
        'user-summary-roles': '角色用戶',
        'user-summary-role-none': '沒有',
        'user-summary-save': '更改用戶',
        'user-summary-skype': 'Skype用戶名',
        'user-summary-slack': 'Slack用戶名',
        'user-summary-social-links': 'Social links',
        'user-summary-stackoverflow': 'StackOverflow用戶名',
        'user-summary-statistics': 'Activities',
        'user-summary-twitter': 'Twitter user name',
        'user-summary-type': 'User type',
        'user-summary-type-admin': '管理员',
        'user-summary-type-guest': '來客',
        'user-summary-type-member': 'Team member',
        'user-summary-username': 'User name',
        'user-summary-visibility': 'Visibility',
        'user-summary-visibility-hidden': 'User is not shown in People section',
        'user-summary-visibility-shown': 'User is listed in People section',

        'user-tooltip-$count': (count) => {
            var num = cardinal(count);
            return `${num}個用戶`;
        },
    };
};

var chineseNumbers = [ '〇', '一', '二', '三', '四', '五', '六', '七', '八', '九' ];

function cardinalT(num) {
    return cardinal(num, true);
}

function cardinalS(num) {
    return cardinal(num, false);
}

function cardinal(num, traditional) {
    if (num === 2) {
        return (traditional) ? '兩' : '两';
    } else if (num < 10) {
        return chineseNumbers[num];
    } else if (num < 100) {
        var text = '十';
        var tens = Math.floor(num / 10);
        var ones = Math.floor(num % 10);
        if (tens > 1) {
            text = chineseNumbers[tens] + text;
        }
        if (ones) {
            text = text + chineseNumbers[ones];
        }
        return text;
    } else {
        return String(num);
    }
}
