require('moment/locale/zh-cn');
require('moment/locale/zh-hk');
require('moment/locale/zh-tw');
require('moment').defineLocale('zh-sg', { parentLocale: 'zh-cn' });
require('moment').defineLocale('zh-mo', { parentLocale: 'zh-hk' });

// remove white-spaces from relative time
['zh-cn', 'zh-hk', 'zh-tw'].forEach((locale) => {
    var localeData = require('moment').localeData('zh-cn');
    var relativeTime = localeData._relativeTime;
    for (var key in relativeTime) {
        var value = relativeTime[key];
        relativeTime[key] = value.replace(/\s+/g, '');
    }
});

module.exports = function(localeCode) {
    var cantonese = false;
    var traditional = false;
    if (/\-(mo|hk)$/.test(localeCode)) {
        cantonese = true;
        traditional = true;
    } else if (/\-(tw)$/.test(localeCode)) {
        traditional = true;
    }
    if (traditional) {
        return traditionalPhrases;
    } else {
        return simplifiedPhrases;
    }
};

var traditionalPhrases = {
    'action-badge-add': '會添加',
    'action-badge-approve': '會批准',
    'action-badge-archive': '會歸檔',
    'action-badge-disable': '會停用',
    'action-badge-reactivate': '會啟用',
    'action-badge-remove': '會刪除',
    'action-badge-restore': '會恢復',

    'activity-chart-legend-branch': '分支',
    'activity-chart-legend-issue': '問題',
    'activity-chart-legend-member': '成員變更',
    'activity-chart-legend-merge': '代碼合併',
    'activity-chart-legend-merge-request': '合併請求',
    'activity-chart-legend-milestone': '里程碑',
    'activity-chart-legend-post': '貼文',
    'activity-chart-legend-push': '推送',
    'activity-chart-legend-repo': '數據庫修改',
    'activity-chart-legend-survey': '調查',
    'activity-chart-legend-task-list': '任務列表',
    'activity-chart-legend-wiki': 'wiki修改',

    'activity-tooltip-$count': (count) => {
        return `${count}個故事`;
    },
    'activity-tooltip-$count-branch': (count) => {
        return `${count}個分支`;
    },
    'activity-tooltip-$count-issue': (count) => {
        return `${count}個問題`
    },
    'activity-tooltip-$count-member': (count) => {
        return `${count}個成員變更`;
    },
    'activity-tooltip-$count-merge': (count) => {
        return `${count}個代碼合併`;
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return `${count}個合併請求`;
    },
    'activity-tooltip-$count-milestone': (count) => {
        return `${count}個里程碑`
    },
    'activity-tooltip-$count-post': (count) => {
        return `${count}個貼文`;
    },
    'activity-tooltip-$count-push': (count) => {
        return `${count}個代碼推送`;
    },
    'activity-tooltip-$count-repo': (count) => {
        return `${count}個數據庫變更`;
    },
    'activity-tooltip-$count-survey': (count) => {
        return `${count}個調查`;
    },
    'activity-tooltip-$count-task-list': (count) => {
        return `${count}個任務列表`;
    },
    'activity-tooltip-$count-wiki': (count) => {
        return `${count}個wiki修改`;
    },

    'app-name': '電車吧',
    'app-title': '電車吧—管理控制台',

    'confirmation-cancel': '取消',
    'confirmation-confirm': '確認',
    'confirmation-data-loss': '你確定要放棄你所做的更改嗎',

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

    'image-album-cancel': '取消',
    'image-album-done': '完成',
    'image-album-manage': '管理影集',
    'image-album-remove': '刪除選定的照片',
    'image-album-select': '采用選定的照片',
    'image-album-upload': '上傳文件',

    'image-cropping-cancel': '取消',
    'image-cropping-select': '選擇',

    'image-selector-choose-from-album': '從相片集選擇',
    'image-selector-crop-image': '調整大小/位置',
    'image-selector-upload-file': '上傳照片',

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
    'member-list-add': '添加用戶',
    'member-list-approve-all': '批准所有請求',
    'member-list-cancel': '取消',
    'member-list-edit': '編輯成員列表',
    'member-list-reject-all': '拒絕所有請求',
    'member-list-save': '保存成員列表',
    'member-list-status-non-member': '不是成員',
    'member-list-status-pending': '請求未決',
    'member-list-title': '成員',

    'nav-member-new': '新成員',
    'nav-members': '成員',
    'nav-project-new': '新項目',
    'nav-projects': '項目',
    'nav-repositories': '數據庫',
    'nav-role-new': '新角色',
    'nav-roles': '角色',
    'nav-server-new': '新服務器',
    'nav-servers': '服務器',
    'nav-settings': '設置',
    'nav-user-new': '新用戶',
    'nav-users': '用戶',

    'project-list-$title-with-$name': (title, name) => {
        if (title) {
            return `${title} (${name})`;
        } else {
            return name;
        }
    },
    'project-list-add': '添加項目',
    'project-list-cancel': '取消',
    'project-list-confirm-archive-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要存檔這${num}個項目？`;
    },
    'project-list-confirm-restore-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要恢復這${num}個項目？`;
    },
    'project-list-deleted': '已刪除',
    'project-list-edit': '編輯項目列表',
    'project-list-save': '保存項目列表',
    'project-list-status-archived': '已存檔',
    'project-list-status-deleted': '已刪除',
    'project-list-title': '項目',

    'project-summary-$title': (title) => {
        var text = '項目';
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'project-summary-access-control': '訪問控制',
    'project-summary-access-control-member-only': '只有成員才能查看項目內容',
    'project-summary-access-control-non-member-comment': '非成員可以回應',
    'project-summary-access-control-non-member-view': '非成員可以項目內容',
    'project-summary-add': '添加項目',
    'project-summary-archive': '存檔項目',
    'project-summary-cancel': '取消',
    'project-summary-confirm-archive': '你確定要存檔這個項目？',
    'project-summary-confirm-delete': '你確定要刪除這個項目？',
    'project-summary-confirm-restore': '你確定要恢復這個項目？',
    'project-summary-delete': '刪除項目',
    'project-summary-description': '描述',
    'project-summary-edit': '編輯項目',
    'project-summary-emblem': '象徵',
    'project-summary-name': '識別碼',
    'project-summary-new-members': '新成員',
    'project-summary-new-members-auto-accept-guest': '自動批准訪客用戶',
    'project-summary-new-members-auto-accept-user': '自動批准普通用戶',
    'project-summary-new-members-join-guest': '訪客用戶可以請求加入項目',
    'project-summary-new-members-join-user': '普通用戶可以請求加入項目',
    'project-summary-new-members-manual': '成員手動添加',
    'project-summary-other-actions': '其他行動',
    'project-summary-restore': '恢復項目',
    'project-summary-return': '返回到項目列表',
    'project-summary-save': '保存項目',
    'project-summary-statistics': '活動',
    'project-summary-title': '名稱',

    'project-tooltip-$count-others': (count) => {
        var num = cardinalT(count);
        return `還有${num}個`;
    },

    'repo-list-cancel': '取消',
    'repo-list-confirm-remove-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要從項目解除這${num}個數據庫？`
    },
    'repo-list-edit': '編輯數據庫列表',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Enabled',
    'repo-list-save': '保存數據庫列表',
    'repo-list-title': '數據庫',

    'repo-summary-$title': (title) => {
        var text = `數據庫`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': '取消',
    'repo-summary-confirm-remove': '你確定要從項目解除這個數據庫？',
    'repo-summary-confirm-restore': '你確定要再次將這個數據庫連接到項目？',
    'repo-summary-edit': '編輯數據庫',
    'repo-summary-gitlab-name': 'GitLab數據庫名',
    'repo-summary-issue-tracker': '問題跟踪器',
    'repo-summary-issue-tracker-disabled': '不使用',
    'repo-summary-issue-tracker-enabled': '啟用',
    'repo-summary-remove': '解除數據庫',
    'repo-summary-restore': '恢復數據庫',
    'repo-summary-return': '返回到數據庫列表',
    'repo-summary-save': '保存數據庫',
    'repo-summary-statistics': '活動',
    'repo-summary-title': '名稱',

    'repository-tooltip-$count': (count) => {
        return `${count}個數據庫`;
    },

    'role-list-add': '添加角色',
    'role-list-cancel': '取消',
    'role-list-confirm-disable-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要停用這${num}個角色？`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要啟用這${num}個角色？`
    },
    'role-list-edit': '編輯角色列表',
    'role-list-save': '保存角色列表',
    'role-list-status-deleted': '已刪除',
    'role-list-status-disabled': '已停用',
    'role-list-title': '角色',

    'role-summary-$title': (title) => {
        var text = '角色';
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'role-summary-add': '添加角色',
    'role-summary-cancel': '取消',
    'role-summary-confirm-delete': '你確定要刪除這個角色？',
    'role-summary-confirm-disable': '你確定要停用這個角色？',
    'role-summary-confirm-reactivate': '你確定要啟用這個角色？',
    'role-summary-delete': '刪除角色',
    'role-summary-description': '描述',
    'role-summary-disable': '停用角色',
    'role-summary-edit': '編輯角色',
    'role-summary-name': '識別碼',
    'role-summary-rating': '故事優先',
    'role-summary-rating-high': '高',
    'role-summary-rating-low': '低',
    'role-summary-rating-normal': '平常',
    'role-summary-rating-very-high': '非常高',
    'role-summary-rating-very-low': '非常低',
    'role-summary-reactivate': '啟用角色',
    'role-summary-return': '返回到角色列表',
    'role-summary-save': '保存角色',
    'role-summary-title': '名稱',
    'role-summary-users': '用戶',

    'role-tooltip-$count-others': (count) => {
        var num = cardinalT(count);
        return `還有${num}個`;
    },

    'server-list-add': '添加服務器',
    'server-list-api-access-false': '',
    'server-list-api-access-true': '已取得',
    'server-list-cancel': '取消',
    'server-list-confirm-disable-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要停用這${num}個服務器？`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要啟用這${num}個服務器？`
    },
    'server-list-edit': '編輯服務器列表',
    'server-list-oauth-false': '',
    'server-list-oauth-true': '使用',
    'server-list-save': '保存服務器列表',
    'server-list-status-deleted': '已刪除',
    'server-list-status-disabled': '已停用',
    'server-list-title': '服務器',

    'server-summary-acquire': '獲取API訪問權限',
    'server-summary-activities': '活動',
    'server-summary-add': '添加服務器',
    'server-summary-api-access': 'API訪問權限',
    'server-summary-api-access-acquired': '已取得管理權限',
    'server-summary-api-access-not-applicable': '不適用',
    'server-summary-api-access-pending': '等待用戶操作',
    'server-summary-cancel': '取消',
    'server-summary-confirm-delete': '你確定要刪除這個服務器？',
    'server-summary-confirm-disable': '你確定要停用這個服務器？',
    'server-summary-confirm-reactivate': '你確定要啟用這個服務器？',
    'server-summary-delete': '刪除服務器',
    'server-summary-disable': '停用服務器',
    'server-summary-edit': '編輯服務器',
    'server-summary-gitlab-admin': 'GitLab管理員',
    'server-summary-gitlab-external-user': 'GitLab外部用戶',
    'server-summary-gitlab-regular-user': 'Gitlab普通用戶',
    'server-summary-member-$name': (name) => {
        return `服務器: ${name}`;
    },
    'server-summary-name': '識別碼',
    'server-summary-new-user': '新用戶',
    'server-summary-new-users': '新用戶',
    'server-summary-oauth-app-id': '應用程式ID',
    'server-summary-oauth-app-key': '應用程式ID',
    'server-summary-oauth-app-secret': '應用程式秘密',
    'server-summary-oauth-application-id': '應用程式ID',
    'server-summary-oauth-application-secret': '應用程式秘密',
    'server-summary-oauth-callback-url': '回叫網址',
    'server-summary-oauth-client-id': '客戶端ID',
    'server-summary-oauth-client-secret': '客戶端秘密',
    'server-summary-oauth-gitlab-url': 'GitLab網址',
    'server-summary-oauth-redirect-uri': '重定向網址',
    'server-summary-oauth-redirect-url': '重定向網址',
    'server-summary-oauth-site-url': '網站網址',
    'server-summary-reactivate': '啟用服務器',
    'server-summary-return': '返回到服務器列表',
    'server-summary-role-none': '不要將任何角色分配給新用戶',
    'server-summary-roles': '角色分配',
    'server-summary-save': '保存服務器',
    'server-summary-system-address-missing': '系統網址尚未設置',
    'server-summary-test-oauth': '測試OAuth集成',
    'server-summary-title': '名稱',
    'server-summary-type': '服務器類型',
    'server-summary-user-automatic-approval': '自動批准新用戶',
    'server-summary-user-import-disabled': '不要註冊新用戶',
    'server-summary-user-import-gitlab-admin-disabled': '不要導入Gitlab管理員',
    'server-summary-user-import-gitlab-external-user-disabled': '不要導入Gitlab外部用戶',
    'server-summary-user-import-gitlab-user-disabled': '不要導入Gitlab普通用戶',
    'server-summary-user-type-admin': '管理員',
    'server-summary-user-type-guest': '訪客用戶',
    'server-summary-user-type-moderator': '檢查員',
    'server-summary-user-type-regular': '普通用戶',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': '背景圖',
    'settings-cancel': '取消',
    'settings-edit': '編輯設置',
    'settings-input-languages': '輸入語言',
    'settings-push-relay': 'Push通知中繼網址',
    'settings-save': '保存設置',
    'settings-site-address': '網址',
    'settings-site-description': '描述',
    'settings-site-title': '網站名稱',
    'settings-title': '設置',

    'sign-in-$title': (title) => {
        var text = `登錄`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': '訪問請求被拒絕',
    'sign-in-error-account-disabled': '用戶目前被禁用',
    'sign-in-error-existing-users-only': '只有授權人員才能訪問此系統',
    'sign-in-error-restricted-area': '用戶不是管理員',
    'sign-in-oauth': '使用OAuth登錄',
    'sign-in-password': '密碼：',
    'sign-in-problem-incorrect-username-password': '用戶名或密碼錯誤',
    'sign-in-problem-no-support-for-username-password': '服務器不接受密碼',
    'sign-in-problem-unexpected-error': '遇到意外的錯誤',
    'sign-in-submit': '登錄',
    'sign-in-username': '用戶名：',

    'sign-off-menu-sign-off': '登出',

    'table-heading-api-access': 'API訪問﻿',
    'table-heading-date-range': '活動期間',
    'table-heading-email': '電子郵件地址',
    'table-heading-issue-tracker': '問題追踪器',
    'table-heading-last-modified': '上次修改時間',
    'table-heading-last-month': '上個月',
    'table-heading-name': '名稱',
    'table-heading-oauth': 'OAuth認證',
    'table-heading-projects': '項目',
    'table-heading-repositories': '數據庫',
    'table-heading-roles': '角色',
    'table-heading-server': '服務器',
    'table-heading-this-month': '本月',
    'table-heading-title': '名稱',
    'table-heading-to-date': '至今',
    'table-heading-type': '類型',
    'table-heading-users': '用戶',

    'task-$seconds': (seconds) => {
        return `${seconds}秒`;
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        return `從《${repo}》數據庫導入了${count}個提交回應`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        return `從《${repo}》數據庫導入了${count}個事件`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        return `從《${repo}》數據庫導入了${count}個問題回應`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        return `從《${repo}》數據庫導入了${count}個合併請求回應`;
    },
    'task-imported-$count-repos': (count) => {
        return `導入了${count}個數據庫`;
    },
    'task-imported-$count-users': (count) => {
        return `導入了${count}個用戶`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        return `從《${repo}》數據庫的《${branch}》分支導入有${count}個提交的代碼推送`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `從《${repo}》數據庫導入提交回應`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `從《${repo}》數據庫導入事件`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `從《${repo}》數據庫導入問題回應`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `從《${repo}》數據庫導入合併請求回應`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `從《${repo}》數據庫導入代碼推送`;
    },
    'task-importing-repos': '導入數據庫',
    'task-importing-users': '導入用戶',
    'task-installed-$count-hooks': (count) => {
        return `安裝了${count}個項目鉤`;
    },
    'task-installing-hooks': '安裝項目鉤',
    'task-removed-$count-hooks': (count) => {
        return `卸載了${count}個項目鉤`;
    },
    'task-removed-$count-repos': (count) => {
        return `刪除了${count}個數據庫`;
    },
    'task-removed-$count-users': (count) => {
        return `刪除了${count}個用戶`;
    },
    'task-removing-hooks': 'Uninstalling hooks',
    'task-updated-$count-repos': (count) => {
        return `改性了${count}個數據庫`;
    },
    'task-updated-$count-users': (count) => {
        return `改性了${count}個用戶`;
    },

    'text-field-placeholder-none': '空白',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, '和', tooltip ];
    },
    'tooltip-more': '更多',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        var num = cardinalT(count);
        return `上傳${num}個文件，剩下${size}`;
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
    'user-list-add': '添加用戶',
    'user-list-approve-all': '批准所有請求',
    'user-list-cancel': '取消',
    'user-list-confirm-disable-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要關閉這${num}個用戶？`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        var num = cardinalT(count);
        return `你確定要恢復這${num}個用戶？`
    },
    'user-list-edit': '編輯用戶列表',
    'user-list-reject-all': '拒絕所有請求',
    'user-list-save': '保存用戶列表',
    'user-list-status-deleted': '已刪除',
    'user-list-status-disabled': '已關閉',
    'user-list-status-pending': '等待批准',
    'user-list-title': '用戶',
    'user-list-type-admin': '管理員',
    'user-list-type-guest': '訪客用戶',
    'user-list-type-moderator': '檢查員',
    'user-list-type-regular': '普通用戶',
    'user-summary-$name': (name) => {
        var text = '用戶';
        if (name) {
            text += `： ${name}`;
        }
        return text;
    },
    'user-summary-add': '添加用戶',
    'user-summary-cancel': '取消',
    'user-summary-confirm-delete': '你確定要刪除這個用戶？',
    'user-summary-confirm-disable': '你確定要關閉這個用戶？',
    'user-summary-confirm-reactivate': '你確定要恢復這個用戶？',
    'user-summary-delete': '刪除用戶',
    'user-summary-disable': '關閉用戶',
    'user-summary-edit': '編輯用戶',
    'user-summary-email': '電子郵件地址',
    'user-summary-github': 'GitHub個人資料網址',
    'user-summary-gitlab': 'GitLab個人資料網址',
    'user-summary-ichat': 'iChat用戶名',
    'user-summary-linkedin': 'LinkedIn個人資料網址',
    'user-summary-member-$name': (name) => {
        var text = '成員';
        if (name) {
            text += `： ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': '編輯成員',
    'user-summary-member-return': '返回到成員列表',
    'user-summary-member-save': '保存成員',
    'user-summary-name': '名稱',
    'user-summary-phone': '電話號碼',
    'user-summary-profile-image': '檔案圖像',
    'user-summary-reactivate': '恢復用戶',
    'user-summary-return': '返回到用戶列表',
    'user-summary-role-none': '沒有',
    'user-summary-roles': '角色',
    'user-summary-save': '保存用戶',
    'user-summary-skype': 'Skype用戶名',
    'user-summary-slack': 'Slack用戶ID',
    'user-summary-slack-team': 'Slack團體ID',
    'user-summary-social-links': '社交鏈接',
    'user-summary-stackoverflow': 'StackOverflow個人資料網址',
    'user-summary-statistics': '活動',
    'user-summary-twitter': 'Twitter用戶名',
    'user-summary-type': '用戶類型',
    'user-summary-type-admin': '管理員',
    'user-summary-type-guest': '訪客用戶',
    'user-summary-type-moderator': '檢查員',
    'user-summary-type-regular': '普通用戶',
    'user-summary-username': '用戶名',
    'user-summary-visibility': '能見度',
    'user-summary-visibility-hidden': '用戶不會在《人員》頁出現',
    'user-summary-visibility-shown': '用戶會在《人員》頁出現',

    'user-tooltip-$count': (count) => {
        return `${count}個用戶`;
    },

    'validation-duplicate-project-name': '具有該標識符的項目已經存在',
    'validation-duplicate-role-name': '具有該標識符的角色已經存在',
    'validation-duplicate-server-name': '具有該標識符的服務器已經存在',
    'validation-duplicate-user-name': '具有該用戶名的用戶已經存在',
    'validation-illegal-project-name': '項目標識符不能是《global》或《admin》',
    'validation-password-for-admin-only': '只有管理員可以使用密碼登錄',
    'validation-required': '需要',

    'welcome': '歡迎!',
};

var simplifiedPhrases = {
    'action-badge-add': '会添加',
    'action-badge-approve': '会批准',
    'action-badge-archive': '会归档',
    'action-badge-disable': '会停用',
    'action-badge-reactivate': '会启用',
    'action-badge-remove': '会删除',
    'action-badge-restore': '会恢复',

    'activity-chart-legend-branch': '分支',
    'activity-chart-legend-issue': '问题',
    'activity-chart-legend-member': '成员变更',
    'activity-chart-legend-merge': '代码合并',
    'activity-chart-legend-merge-request': '合并请求',
    'activity-chart-legend-milestone': '里程碑',
    'activity-chart-legend-post': '贴文',
    'activity-chart-legend-push': '推送',
    'activity-chart-legend-repo': '数据库修改',
    'activity-chart-legend-survey': '调查',
    'activity-chart-legend-task-list': '任务列表',
    'activity-chart-legend-wiki': 'wiki修改',

    'activity-tooltip-$count': (count) => {
        return `${count}个故事`;
    },
    'activity-tooltip-$count-branch': (count) => {
        return `${count}个分支`;
    },
    'activity-tooltip-$count-issue': (count) => {
        return `${count}个问题`
    },
    'activity-tooltip-$count-member': (count) => {
        return `${count}个成员变更`;
    },
    'activity-tooltip-$count-merge': (count) => {
        return `${count}个代码合并`;
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return `${count}个合并請求`;
    },
    'activity-tooltip-$count-milestone': (count) => {
        return `${count}个里程碑`
    },
    'activity-tooltip-$count-post': (count) => {
        return `${count}个贴文`;
    },
    'activity-tooltip-$count-push': (count) => {
        return `${count}个代码推送`;
    },
    'activity-tooltip-$count-repo': (count) => {
        return `${count}个数据库变更`;
    },
    'activity-tooltip-$count-survey': (count) => {
        return `${count}个调查`;
    },
    'activity-tooltip-$count-task-list': (count) => {
        return `${count}个任务列表`;
    },
    'activity-tooltip-$count-wiki': (count) => {
        return `${count}个wiki修改`;
    },

    'app-name': '电车吧',
    'app-title': '电车吧—管理控制台',

    'confirmation-cancel': '取消',
    'confirmation-confirm': '确认',
    'confirmation-data-loss': '你确定要放弃你所做的更改吗',

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

    'image-album-cancel': '取消',
    'image-album-done': '完成',
    'image-album-manage': '管理影集',
    'image-album-remove': '删除选定的照片',
    'image-album-select': '采用选定的照片',
    'image-album-upload': '上传文件',

    'image-cropping-cancel': '取消',
    'image-cropping-select': '选择',

    'image-selector-choose-from-album': '从相片集选择',
    'image-selector-crop-image': '调整大小/位置',
    'image-selector-upload-file': '上传照片',

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
    'member-list-add': '添加用户',
    'member-list-approve-all': '批准所有请求',
    'member-list-cancel': '取消',
    'member-list-edit': '编辑成员列表',
    'member-list-reject-all': '拒绝所有请求',
    'member-list-save': '保存成员列表',
    'member-list-status-non-member': '不是成员',
    'member-list-status-pending': '请求未决',
    'member-list-title': '成员',

    'nav-member-new': '新成员',
    'nav-members': '成员',
    'nav-project-new': '新项目',
    'nav-projects': '项目',
    'nav-repositories': '数据库',
    'nav-role-new': '新角色',
    'nav-roles': '角色',
    'nav-server-new': '新服务器',
    'nav-servers': '服务器',
    'nav-settings': '设置',
    'nav-user-new': '新用户',
    'nav-users': '用户',

    'project-list-$title-with-$name': (title, name) => {
        if (title) {
            return `${title} (${name})`;
        } else {
            return name;
        }
    },
    'project-list-add': '添加项目',
    'project-list-cancel': '取消',
    'project-list-confirm-archive-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要存档这${num}个项目？`;
    },
    'project-list-confirm-restore-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要恢复这${num}个项目？`;
    },
    'project-list-deleted': '已删除',
    'project-list-edit': '编辑项目列表',
    'project-list-save': '保存项目列表',
    'project-list-status-archived': '已存档',
    'project-list-status-deleted': '已删除',
    'project-list-title': '项目',

    'project-summary-$title': (title) => {
        var text = '项目';
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'project-summary-access-control': '访问控制',
    'project-summary-access-control-member-only': '只有成员才能查看项目内容',
    'project-summary-access-control-non-member-comment': '非成员可以回应',
    'project-summary-access-control-non-member-view': '非成员可以项目内容',
    'project-summary-add': '添加项目',
    'project-summary-archive': '存档项目',
    'project-summary-cancel': '取消',
    'project-summary-confirm-archive': '你确定要存档这个项目？',
    'project-summary-confirm-delete': '你确定要删除这个项目？',
    'project-summary-confirm-restore': '你确定要恢复这个项目？',
    'project-summary-delete': '删除项目',
    'project-summary-description': '描述',
    'project-summary-edit': '编辑项目',
    'project-summary-emblem': '象征',
    'project-summary-name': '识别码',
    'project-summary-new-members': '新成员',
    'project-summary-new-members-auto-accept-guest': '自动批准访客用户',
    'project-summary-new-members-auto-accept-user': '自动批准普通用户',
    'project-summary-new-members-join-guest': '访客用户可以请求加入项目',
    'project-summary-new-members-join-user': '普通用户可以请求加入项目',
    'project-summary-new-members-manual': '成员手动添加',
    'project-summary-other-actions': '其他行动',
    'project-summary-restore': '恢复项目',
    'project-summary-return': '返回到项目列表',
    'project-summary-save': '保存项目',
    'project-summary-statistics': '活动',
    'project-summary-title': '名称',

    'project-tooltip-$count-others': (count) => {
        var num = cardinalT(count);
        return `还有${num}个`;
    },

    'repo-list-cancel': '取消',
    'repo-list-confirm-remove-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要从项目解除这${num}个数据库？`
    },
    'repo-list-edit': '编辑数据库列表',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Enabled',
    'repo-list-save': '保存数据库列表',
    'repo-list-title': '数据库',

    'repo-summary-$title': (title) => {
        var text = `数据库`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': '取消',
    'repo-summary-confirm-remove': '你确定要从项目解除这个数据库？',
    'repo-summary-confirm-restore': '你确定要再次将这个数据库连接到项目？',
    'repo-summary-edit': '编辑数据库',
    'repo-summary-gitlab-name': 'GitLab数据库名',
    'repo-summary-issue-tracker': '问题跟踪器',
    'repo-summary-issue-tracker-disabled': '不使用',
    'repo-summary-issue-tracker-enabled': '启用',
    'repo-summary-remove': '解除数据库',
    'repo-summary-restore': '恢复数据库',
    'repo-summary-return': '返回到数据库列表',
    'repo-summary-save': '保存数据库',
    'repo-summary-statistics': '活动',
    'repo-summary-title': '名称',

    'repository-tooltip-$count': (count) => {
        return `${count}个数据库`;
    },

    'role-list-add': '添加角色',
    'role-list-cancel': '取消',
    'role-list-confirm-disable-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要停用这${num}个角色？`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要启用这${num}个角色？`
    },
    'role-list-edit': '编辑角色列表',
    'role-list-save': '保存角色列表',
    'role-list-status-deleted': '已删除',
    'role-list-status-disabled': '已停用',
    'role-list-title': '角色',

    'role-summary-$title': (title) => {
        var text = '角色';
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'role-summary-add': '添加角色',
    'role-summary-cancel': '取消',
    'role-summary-confirm-delete': '你确定要删除这个角色？',
    'role-summary-confirm-disable': '你确定要停用这个角色？',
    'role-summary-confirm-reactivate': '你确定要启用这个角色？',
    'role-summary-delete': '删除角色',
    'role-summary-description': '描述',
    'role-summary-disable': '停用角色',
    'role-summary-edit': '编辑角色',
    'role-summary-name': '识别码',
    'role-summary-rating': '故事优先',
    'role-summary-rating-high': '高',
    'role-summary-rating-low': '低',
    'role-summary-rating-normal': '平常',
    'role-summary-rating-very-high': '非常高',
    'role-summary-rating-very-low': '非常低',
    'role-summary-reactivate': '启用角色',
    'role-summary-return': '返回到角色列表',
    'role-summary-save': '保存角色',
    'role-summary-title': '名称',
    'role-summary-users': '用户',

    'role-tooltip-$count-others': (count) => {
        var num = cardinalT(count);
        return `还有${num}个`;
    },

    'server-list-add': '添加服务器',
    'server-list-api-access-false': '',
    'server-list-api-access-true': '已取得',
    'server-list-cancel': '取消',
    'server-list-confirm-disable-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要停用这${num}个服务器？`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要启用这${num}个服务器？`
    },
    'server-list-edit': '编辑服务器列表',
    'server-list-oauth-false': '',
    'server-list-oauth-true': '使用',
    'server-list-save': '保存服务器列表',
    'server-list-status-deleted': '已删除',
    'server-list-status-disabled': '已停用',
    'server-list-title': '服务器',

    'server-summary-acquire': '获取API访问权限',
    'server-summary-activities': '活动',
    'server-summary-add': '添加服务器',
    'server-summary-api-access': 'API访问权限',
    'server-summary-api-access-acquired': '已取得管理权限',
    'server-summary-api-access-not-applicable': '不适用',
    'server-summary-api-access-pending': '等待用户操作',
    'server-summary-cancel': '取消',
    'server-summary-confirm-delete': '你确定要删除这个服务器？',
    'server-summary-confirm-disable': '你确定要停用这个服务器？',
    'server-summary-confirm-reactivate': '你确定要启用这个服务器？',
    'server-summary-delete': '删除服务器',
    'server-summary-disable': '停用服务器',
    'server-summary-edit': '编辑服务器',
    'server-summary-gitlab-admin': 'GitLab管理员',
    'server-summary-gitlab-external-user': 'GitLab外部用户',
    'server-summary-gitlab-regular-user': 'Gitlab普通用户',
    'server-summary-member-$name': (name) => {
        return `服务器: ${name}`;
    },
    'server-summary-name': '识别码',
    'server-summary-new-user': '新用户',
    'server-summary-new-users': '新用户',
    'server-summary-oauth-app-id': '应用程式ID',
    'server-summary-oauth-app-key': '应用程式ID',
    'server-summary-oauth-app-secret': '应用程式秘密',
    'server-summary-oauth-application-id': '应用程式ID',
    'server-summary-oauth-application-secret': '应用程式秘密',
    'server-summary-oauth-callback-url': '回叫网址',
    'server-summary-oauth-client-id': '客户端ID',
    'server-summary-oauth-client-secret': '客户端秘密',
    'server-summary-oauth-gitlab-url': 'GitLab网址',
    'server-summary-oauth-redirect-uri': '重定向网址',
    'server-summary-oauth-redirect-url': '重定向网址',
    'server-summary-oauth-site-url': '网站网址',
    'server-summary-reactivate': '启用服务器',
    'server-summary-return': '返回到服务器列表',
    'server-summary-role-none': '不要将任何角色分配给新用户',
    'server-summary-roles': '角色分配',
    'server-summary-save': '保存服务器',
    'server-summary-system-address-missing': '系统网址尚未设置',
    'server-summary-test-oauth': '测试OAuth集成',
    'server-summary-title': '名称',
    'server-summary-type': '服务器类型',
    'server-summary-user-automatic-approval': '自动批准新用户',
    'server-summary-user-import-disabled': '不要注册新用户',
    'server-summary-user-import-gitlab-admin-disabled': '不要导入Gitlab管理员',
    'server-summary-user-import-gitlab-external-user-disabled': '不要导入Gitlab外部用户',
    'server-summary-user-import-gitlab-user-disabled': '不要导入Gitlab普通用户',
    'server-summary-user-type-admin': '管理员',
    'server-summary-user-type-guest': '访客用户',
    'server-summary-user-type-moderator': '检查员',
    'server-summary-user-type-regular': '普通用户',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': '背景图',
    'settings-cancel': '取消',
    'settings-edit': '编辑设置',
    'settings-input-languages': '输入语言',
    'settings-push-relay': 'Push通知中继网址',
    'settings-save': '保存设置',
    'settings-site-address': '网址',
    'settings-site-description': '描述',
    'settings-site-title': '网站名称',
    'settings-title': '设置',

    'sign-in-$title': (title) => {
        var text = `登录`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': '访问请求被拒绝',
    'sign-in-error-account-disabled': '用户目前被禁用',
    'sign-in-error-existing-users-only': '只有授权人员才能访问此系统',
    'sign-in-error-restricted-area': '用户不是管理员',
    'sign-in-oauth': '使用OAuth登录',
    'sign-in-password': '密码：',
    'sign-in-problem-incorrect-username-password': '用户名或密码错误',
    'sign-in-problem-no-support-for-username-password': '服务器不接受密码',
    'sign-in-problem-unexpected-error': '遇到意外的错误',
    'sign-in-submit': '登录',
    'sign-in-username': '用户名：',

    'sign-off-menu-sign-off': '登出',

    'table-heading-api-access': 'API访问﻿',
    'table-heading-date-range': '活动期间',
    'table-heading-email': '电子邮件地址',
    'table-heading-issue-tracker': '问题追踪器',
    'table-heading-last-modified': '上次修改时间',
    'table-heading-last-month': '上个月',
    'table-heading-name': '名称',
    'table-heading-oauth': 'OAuth认证',
    'table-heading-projects': '项目',
    'table-heading-repositories': '数据库',
    'table-heading-roles': '角色',
    'table-heading-server': '服务器',
    'table-heading-this-month': '本月',
    'table-heading-title': '名称',
    'table-heading-to-date': '至今',
    'table-heading-type': '类型',
    'table-heading-users': '用户',

    'task-$seconds': (seconds) => {
        return `${seconds}秒`;
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        return `从《${repo}》数据库导入了${count}个提交回应`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        return `从《${repo}》数据库导入了${count}个事件`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        return `从《${repo}》数据库导入了${count}个问题回应`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        return `从《${repo}》数据库导入了${count}个合并请求回应`;
    },
    'task-imported-$count-repos': (count) => {
        return `导入了${count}个数据库`;
    },
    'task-imported-$count-users': (count) => {
        return `导入了${count}个用户`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        return `从《${repo}》数据库的《${branch}》分支导入有${count}个提交的代码推送`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `从《${repo}》数据库导入提交回应`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `从《${repo}》数据库导入事件`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `从《${repo}》数据库导入问题回应`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `从《${repo}》数据库导入合并请求回应`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `从《${repo}》数据库导入代码推送`;
    },
    'task-importing-repos': '导入数据库',
    'task-importing-users': '导入用户',
    'task-installed-$count-hooks': (count) => {
        return `安装了${count}个项目钩`;
    },
    'task-installing-hooks': '安装项目钩',
    'task-removed-$count-hooks': (count) => {
        return `卸载了${count}个项目钩`;
    },
    'task-removed-$count-repos': (count) => {
        return `删除了${count}个数据库`;
    },
    'task-removed-$count-users': (count) => {
        return `删除了${count}个用户`;
    },
    'task-removing-hooks': 'Uninstalling hooks',
    'task-updated-$count-repos': (count) => {
        return `改性了${count}个数据库`;
    },
    'task-updated-$count-users': (count) => {
        return `改性了${count}个用户`;
    },

    'text-field-placeholder-none': '沒有',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, '和', tooltip ];
    },
    'tooltip-more': '更多',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        var num = cardinalT(count);
        return `上传${num}个文件，剩下${size}`;
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
    'user-list-add': '添加用户',
    'user-list-approve-all': '批准所有请求',
    'user-list-cancel': '取消',
    'user-list-confirm-disable-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要关闭这${num}个用户？`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        var num = cardinalT(count);
        return `你确定要恢复这${num}个用户？`
    },
    'user-list-edit': '编辑用户列表',
    'user-list-reject-all': '拒绝所有请求',
    'user-list-save': '保存用户列表',
    'user-list-status-deleted': '已删除',
    'user-list-status-disabled': '已关闭',
    'user-list-status-pending': '等待批准',
    'user-list-title': '用户',
    'user-list-type-admin': '管理员',
    'user-list-type-guest': '访客用户',
    'user-list-type-moderator': '检查员',
    'user-list-type-regular': '普通用户',
    'user-summary-$name': (name) => {
        var text = '用户';
        if (name) {
            text += `： ${name}`;
        }
        return text;
    },
    'user-summary-add': '添加用户',
    'user-summary-cancel': '取消',
    'user-summary-confirm-delete': '你确定要删除这个用户？',
    'user-summary-confirm-disable': '你确定要关闭这个用户？',
    'user-summary-confirm-reactivate': '你确定要恢复这个用户？',
    'user-summary-delete': '删除用户',
    'user-summary-disable': '关闭用户',
    'user-summary-edit': '编辑用户',
    'user-summary-email': '电子邮件地址',
    'user-summary-github': 'GitHub个人资料网址',
    'user-summary-gitlab': 'GitLab个人资料网址',
    'user-summary-ichat': 'iChat用户名',
    'user-summary-linkedin': 'LinkedIn个人资料网址',
    'user-summary-member-$name': (name) => {
        var text = '成员';
        if (name) {
            text += `： ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': '编辑成员',
    'user-summary-member-return': '返回到成员列表',
    'user-summary-member-save': '保存成员',
    'user-summary-name': '名称',
    'user-summary-phone': '电话号码',
    'user-summary-profile-image': '档案图像',
    'user-summary-reactivate': '恢复用户',
    'user-summary-return': '返回到用户列表',
    'user-summary-role-none': '没有',
    'user-summary-roles': '角色',
    'user-summary-save': '保存用户',
    'user-summary-skype': 'Skype用户名',
    'user-summary-slack': 'Slack用户ID',
    'user-summary-slack-team': 'Slack团体ID',
    'user-summary-social-links': '社交链接',
    'user-summary-stackoverflow': 'StackOverflow个人资料网址',
    'user-summary-statistics': '活动',
    'user-summary-twitter': 'Twitter用户名',
    'user-summary-type': '用户类型',
    'user-summary-type-admin': '管理员',
    'user-summary-type-guest': '访客用户',
    'user-summary-type-moderator': '检查员',
    'user-summary-type-regular': '普通用户',
    'user-summary-username': '用户名',
    'user-summary-visibility': '能见度',
    'user-summary-visibility-hidden': '用户不会在《人员》页出现',
    'user-summary-visibility-shown': '用户会在《人员》页出现',

    'user-tooltip-$count': (count) => {
        return `${count}个用户`;
    },

    'validation-duplicate-project-name': '具有该标识符的项目已经存在',
    'validation-duplicate-role-name': '具有该标识符的角色已经存在',
    'validation-duplicate-server-name': '具有该标识符的服务器已经存在',
    'validation-duplicate-user-name': '具有该用户名的用户已经存在',
    'validation-illegal-project-name': '项目标识符不能是《global》或《admin》',
    'validation-password-for-admin-only': '只有管理员可以使用密码登录',
    'validation-required': '需要',

    'welcome': '欢迎!',
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
