import 'moment/locale/zh-cn';
import 'moment/locale/zh-hk';
import 'moment/locale/zh-tw';
import { cardinalT, cardinalS } from 'common/locale/grammars/chinese.mjs';

import Moment from 'moment';
Moment.defineLocale('zh-sg', { parentLocale: 'zh-cn' });
Moment.defineLocale('zh-mo', { parentLocale: 'zh-hk' });

// make relative time consistent with how we count things
['zh-cn', 'zh-hk', 'zh-tw'].forEach((locale) => {
    let localeData = Moment.localeData(locale);
    let rt = localeData._relativeTime;
    if (locale === 'zh-cn') {
        rt.ss = n => cardinalS(n, '一秒');
        rt.m = '一分钟';
        rt.mm = n => cardinalS(n, rt.m);
        rt.h = '一小时';
        rt.hh = n => cardinalS(n, rt.h);
        rt.d = '一天';
        rt.dd = n => cardinalS(n, rt.d);
        rt.M = '一个月';
        rt.MM = n => cardinalS(n, rt.M);
        rt.y = '一年';
        rt.yy = n => cardinalS(n, rt.y);
    } else {
        rt.ss = n => cardinalT(n, '一秒');
        rt.m = '一分鐘';
        rt.mm = n => cardinalT(n, rt.m);
        rt.h = '一小時';
        rt.hh = n => cardinalT(n, rt.h);
        rt.d = '一天';
        rt.dd = n => cardinalT(n, rt.d);
        rt.M = '一個月';
        rt.MM = n => cardinalT(n, rt.M);
        rt.y = '一年';
        rt.yy = n => cardinalT(n, rt.y);
    }
});

function chooseVariant(countryCode) {
    switch (countryCode) {
        case 'mo':
        case 'hk':
        case 'tw':
            return traditionalPhrases;
        default:
            return simplifiedPhrases;
    }
};

const traditionalPhrases = {
    'action-badge-add': '會添加',
    'action-badge-approve': '會批准',
    'action-badge-archive': '會歸檔',
    'action-badge-deselect': '取消',
    'action-badge-disable': '會停用',
    'action-badge-reactivate': '會啟用',
    'action-badge-remove': '會刪除',
    'action-badge-restore': '會恢復',
    'action-badge-select': '選擇',

    'activity-chart-legend-branch': '分支',
    'activity-chart-legend-issue': '問題',
    'activity-chart-legend-member': '成員變更',
    'activity-chart-legend-merge': '代碼合併',
    'activity-chart-legend-merge-request': '合併請求',
    'activity-chart-legend-milestone': '里程碑',
    'activity-chart-legend-post': '貼文',
    'activity-chart-legend-push': '推送',
    'activity-chart-legend-repo': '數據庫修改',
    'activity-chart-legend-snapshot': '網站修訂',
    'activity-chart-legend-survey': '調查',
    'activity-chart-legend-tag': '標籤',
    'activity-chart-legend-task-list': '任務列表',
    'activity-chart-legend-website-traffic': '網站流量報告',
    'activity-chart-legend-wiki': 'wiki修改',

    'activity-tooltip-$count': (count) => {
        return `${count}個故事`;
    },
    'activity-tooltip-$count-branch': (count) => {
        return `${count}個分支`;
    },
    'activity-tooltip-$count-issue': (count) => {
        return `${count}個問題`;
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
        return `${count}個里程碑`;
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
    'activity-tooltip-$count-snapshot': (count) => {
        return `${count}個網站修訂`;
    },
    'activity-tooltip-$count-survey': (count) => {
        return `${count}個調查`;
    },
    'activity-tooltip-$count-tag': (count) => {
        return `${count}個標籤`;
    },
    'activity-tooltip-$count-task-list': (count) => {
        return `${count}個任務列表`;
    },
    'activity-tooltip-$count-website-traffic': (count) => {
        return `${count}個網站流量報告`;
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

    'image-preview-close': '關閉',
    'image-preview-dropbox': 'Dropbox',
    'image-preview-onedrive': 'OneDrive',

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
    'member-list-column-date-range': '活動期間',
    'member-list-column-email': '電子郵件地址',
    'member-list-column-last-modified': '上次修改時間',
    'member-list-column-last-month': '上個月',
    'member-list-column-name': '名稱',
    'member-list-column-roles': '角色',
    'member-list-column-this-month': '本月',
    'member-list-column-to-date': '至今',
    'member-list-column-type': '類型',
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
    'nav-rest-source-new': '新數據源',
    'nav-rest-sources': 'REST數據源',
    'nav-role-new': '新角色',
    'nav-roles': '角色',
    'nav-server-new': '新服務器',
    'nav-servers': '服務器',
    'nav-settings': '設置',
    'nav-spreadsheet-new': '新文件',
    'nav-spreadsheets': 'Excel文件',
    'nav-user-new': '新用戶',
    'nav-users': '用戶',
    'nav-website': '網站',
    'nav-wiki': 'GitLab維基',

    'project-list-add': '添加項目',
    'project-list-cancel': '取消',
    'project-list-column-date-range': '活動期間',
    'project-list-column-last-modified': '上次修改時間',
    'project-list-column-last-month': '上個月',
    'project-list-column-repositories': '數據庫',
    'project-list-column-this-month': '本月',
    'project-list-column-title': '名稱',
    'project-list-column-to-date': '至今',
    'project-list-column-users': '用戶',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinalT(count, '這個項目', '這三個項目');
        return `你確定要存檔${projects}？`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinalT(count, '這個項目', '這三個項目');
        return `你確定要恢復${projects}？`;
    },
    'project-list-edit': '編輯項目列表',
    'project-list-save': '保存項目列表',
    'project-list-status-archived': '已存檔',
    'project-list-status-deleted': '已刪除',
    'project-list-title': '項目',

    'project-summary-$title': (title) => {
        let text = '項目';
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
        return cardinalT(count, `還有一個`);
    },

    'repo-list-cancel': '取消',
    'repo-list-column-date-range': '活動期間',
    'repo-list-column-issue-tracker': '問題追踪器',
    'repo-list-column-last-modified': '上次修改時間',
    'repo-list-column-last-month': '上個月',
    'repo-list-column-server': '服務器',
    'repo-list-column-this-month': '本月',
    'repo-list-column-title': '名稱',
    'repo-list-column-to-date': '至今',
    'repo-list-confirm-remove-$count': (count) => {
        let repos = cardinalT(count, '這個數據庫', '這三個數據庫');
        return `你確定要從項目解除${repos}？`;
    },
    'repo-list-edit': '編輯數據庫列表',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': '啟用',
    'repo-list-save': '保存數據庫列表',
    'repo-list-title': '數據庫',

    'repo-summary-$title': (title) => {
        let text = `數據庫`;
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
        return cardinalT(count, '一個數據庫');
    },

    'rest-list-add': '添加新數據源',
    'rest-list-cancel': '取消',
    'rest-list-column-identifier': '識別碼',
    'rest-list-column-last-modified': '上次修改時間',
    'rest-list-column-type': '類型',
    'rest-list-column-url': 'URL',
    'rest-list-confirm-disable-$count': (count) => {
        let sources = cardinal(count, '此數據源', '這三個數據源');
        return `你確定要停用${sources}嗎？`;
    },
    'rest-list-confirm-reactivate-$count': (count) => {
        let sources = cardinal(count, '此數據源', '這三個數據源');
        return `你確定要重新啟用${sources}嗎？`;
    },
    'rest-list-edit': '編輯數據源列表',
    'rest-list-save': '保存數據源列表',
    'rest-list-status-deleted': '已刪除',
    'rest-list-status-disabled': '已停用',
    'rest-list-title': 'REST數據源',

    'rest-summary-$title': (title) => {
        let text = 'REST數據源';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'rest-summary-add': '添加新數據源',
    'rest-summary-cancel': '取消',
    'rest-summary-confirm-delete': '你確定要刪除此數據源嗎？',
    'rest-summary-confirm-disable': '你確定要停用此數據源嗎？',
    'rest-summary-confirm-reactivate': '你確定要重新啟用此數據源嗎？',
    'rest-summary-delete': '刪除數據源',
    'rest-summary-description': '描述',
    'rest-summary-disable': '停用數據源',
    'rest-summary-edit': '編輯數據源',
    'rest-summary-max-age': '數據最大年齡',
    'rest-summary-name': '識別碼',
    'rest-summary-reactivate': '重新啟用數據源',
    'rest-summary-return': '返回數據源列表',
    'rest-summary-save': '保存數據源',
    'rest-summary-type': '類型',
    'rest-summary-url': 'URL',

    'rest-type-generic': '通用',
    'rest-type-wordpress': 'WordPress',

    'role-list-add': '添加角色',
    'role-list-cancel': '取消',
    'role-list-column-last-modified': '上次修改時間',
    'role-list-column-title': '名稱',
    'role-list-column-users': '用戶',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinalT(count, '這個角色', '這三個角色');
        return `你確定要停用${roles}？`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinalT(count, '這個角色', '這三個角色');
        return `你確定要啟用${roles}？`;
    },
    'role-list-edit': '編輯角色列表',
    'role-list-save': '保存角色列表',
    'role-list-status-deleted': '已刪除',
    'role-list-status-disabled': '已停用',
    'role-list-title': '角色',

    'role-summary-$title': (title) => {
        let text = '角色';
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
        return cardinalT(count, `還有一個`);
    },

    'server-list-add': '添加服務器',
    'server-list-api-access-false': '',
    'server-list-api-access-true': '已取得',
    'server-list-cancel': '取消',
    'server-list-column-api-access': 'API訪問﻿',
    'server-list-column-last-modified': '上次修改時間',
    'server-list-column-oauth': 'OAuth認證',
    'server-list-column-title': '名稱',
    'server-list-column-type': '類型',
    'server-list-column-users': '用戶',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinalT(count, '這個服務器', '這三個服務器');
        return `你確定要停用${servers}？`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinalT(count, '這個服務器', '這三個服務器');
        return `你確定要啟用${servers}？`;
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
    'server-summary-gitlab-regular-user': 'GitLab普通用戶',
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
    'server-summary-oauth-callback-url': '回調URL',
    'server-summary-oauth-client-id': '客戶端ID',
    'server-summary-oauth-client-secret': '客戶端秘密',
    'server-summary-oauth-deauthorize-callback-url': '取消授權的回調URL',
    'server-summary-oauth-gitlab-url': 'GitLab URL',
    'server-summary-oauth-redirect-uri': '重定向URL',
    'server-summary-oauth-redirect-url': '重定向URL',
    'server-summary-oauth-site-url': '網站URL',
    'server-summary-privacy-policy-url': '隱私政策URL',
    'server-summary-reactivate': '啟用服務器',
    'server-summary-return': '返回到服務器列表',
    'server-summary-role-none': '不要將任何角色分配給新用戶',
    'server-summary-roles': '角色分配',
    'server-summary-save': '保存服務器',
    'server-summary-system-address-missing': '系統網址尚未設置',
    'server-summary-terms-and-conditions-url': '條款和條件URL',
    'server-summary-test-oauth': '測試OAuth集成',
    'server-summary-title': '名稱',
    'server-summary-type': '服務器類型',
    'server-summary-user-automatic-approval': '自動批准新用戶',
    'server-summary-user-import-disabled': '不要註冊新用戶',
    'server-summary-user-import-gitlab-admin-disabled': '不要導入GitLab管理員',
    'server-summary-user-import-gitlab-external-user-disabled': '不要導入GitLab外部用戶',
    'server-summary-user-import-gitlab-user-disabled': '不要導入GitLab普通用戶',
    'server-summary-user-type-admin': '管理員',
    'server-summary-user-type-guest': '訪客用戶',
    'server-summary-user-type-moderator': '檢查員',
    'server-summary-user-type-regular': '普通用戶',
    'server-summary-whitelist': '電子郵件地址白名單',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': '背景圖',
    'settings-cancel': '取消',
    'settings-company-name': '公司名',
    'settings-edit': '編輯設置',
    'settings-input-languages': '輸入語言',
    'settings-push-relay': 'Push通知中繼URL',
    'settings-save': '保存設置',
    'settings-site-address': '網址',
    'settings-site-description': '描述',
    'settings-site-title': '網站名稱',
    'settings-title': '設置',

    'sign-in-$title': (title) => {
        let text = `登錄`;
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

    'spreadsheet-list-add': '添加新鏈接',
    'spreadsheet-list-cancel': '取消',
    'spreadsheet-list-column-filename': '文件名',
    'spreadsheet-list-column-last-modified': '上次修改時間',
    'spreadsheet-list-column-sheets': '表格',
    'spreadsheet-list-column-url': 'URL',
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, '此鏈接', '這兩個鏈接');
        return `你確定要停用${spreadsheets}嗎？`;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, '此鏈接', '這兩個鏈接');
        return `你確定要重新啟用${spreadsheets}嗎？`;
    },
    'spreadsheet-list-edit': '編輯鏈接列表',
    'spreadsheet-list-save': '保存鏈接列表',
    'spreadsheet-list-status-deleted': '已刪除',
    'spreadsheet-list-status-disabled': '已停用',
    'spreadsheet-list-title': 'Excel文件',

    'spreadsheet-summary-$title': (title) => {
        let text = 'Excel文件';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': '添加新鏈接',
    'spreadsheet-summary-cancel': '取消',
    'spreadsheet-summary-confirm-delete': '你確定要刪除此鏈接嗎？',
    'spreadsheet-summary-confirm-disable': '你確定要停用此鏈接嗎？',
    'spreadsheet-summary-confirm-reactivate': '你確定要重新啟用此鏈接嗎？',
    'spreadsheet-summary-delete': '刪除鏈接',
    'spreadsheet-summary-description': '描述',
    'spreadsheet-summary-disable': '停用鏈接',
    'spreadsheet-summary-edit': '編輯鏈接',
    'spreadsheet-summary-filename': '文件名',
    'spreadsheet-summary-hidden': '搜索',
    'spreadsheet-summary-hidden-false': '出現在搜索結果中',
    'spreadsheet-summary-hidden-true': '不會在搜索結果中出現',
    'spreadsheet-summary-name': '識別碼',
    'spreadsheet-summary-reactivate': '重新啟用鏈接',
    'spreadsheet-summary-return': '返回鏈接列表',
    'spreadsheet-summary-save': '保存鏈接',
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `表格${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': '標題',
    'spreadsheet-summary-url': 'URL',

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
        return `安裝了${count}個鉤`;
    },
    'task-installing-hooks': '安裝掛鉤',
    'task-removed-$count-hooks': (count) => {
        return `卸載了${count}個掛鉤`;
    },
    'task-removed-$count-repos': (count) => {
        return `刪除了${count}個數據庫`;
    },
    'task-removed-$count-users': (count) => {
        return `刪除了${count}個用戶`;
    },
    'task-removing-hooks': '卸載掛鉤',
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

    'tz-name-abidjan': '阿比讓',
    'tz-name-accra': '阿克拉',
    'tz-name-acre': '阿克里',
    'tz-name-act': '澳大利亞首都直轄區',
    'tz-name-adak': '埃達克',
    'tz-name-addis-ababa': '亞的斯亞貝巴',
    'tz-name-adelaide': '阿德萊德',
    'tz-name-aden': '亞丁',
    'tz-name-africa': '非洲',
    'tz-name-alaska': '阿拉斯加州',
    'tz-name-aleutian': '阿留申',
    'tz-name-algiers': '阿爾及爾',
    'tz-name-almaty': '阿拉木圖',
    'tz-name-america': '美洲',
    'tz-name-amman': '安曼',
    'tz-name-amsterdam': '阿姆斯特丹',
    'tz-name-anadyr': '阿納德爾',
    'tz-name-anchorage': '安克雷奇',
    'tz-name-andorra': '安道爾',
    'tz-name-anguilla': '安圭拉',
    'tz-name-antananarivo': '塔那那利佛',
    'tz-name-antarctica': '南極洲',
    'tz-name-antigua': '安提瓜',
    'tz-name-apia': '阿皮亞',
    'tz-name-aqtau': '阿克陶',
    'tz-name-aqtobe': '阿克托別',
    'tz-name-araguaina': '阿拉圭納',
    'tz-name-arctic': '北極',
    'tz-name-argentina': '阿根廷',
    'tz-name-arizona': '亞利桑那',
    'tz-name-aruba': '阿魯巴',
    'tz-name-ashgabat': '阿什哈巴德',
    'tz-name-ashkhabad': '阿什哈巴德',
    'tz-name-asia': '亞洲',
    'tz-name-asmara': '阿斯馬拉',
    'tz-name-asmera': '阿斯馬拉',
    'tz-name-astrakhan': '阿斯特拉罕',
    'tz-name-asuncion': '亞松森',
    'tz-name-athens': '雅典',
    'tz-name-atikokan': '阿蒂科肯',
    'tz-name-atka': '阿特卡',
    'tz-name-atlantic': '大西洋',
    'tz-name-atyrau': '阿特勞',
    'tz-name-auckland': '奧克蘭',
    'tz-name-australia': '澳大利亞',
    'tz-name-azores': '亞速爾群島',
    'tz-name-baghdad': '巴格達',
    'tz-name-bahia': '巴伊亞',
    'tz-name-bahia-banderas': '巴伊亞班德拉斯',
    'tz-name-bahrain': '巴林',
    'tz-name-baja-norte': '北下加利福尼亞',
    'tz-name-baja-sur': '南下加利福尼亞',
    'tz-name-baku': '巴庫',
    'tz-name-bamako': '巴馬科',
    'tz-name-bangkok': '曼谷',
    'tz-name-bangui': '班吉',
    'tz-name-banjul': '班珠爾',
    'tz-name-barbados': '巴巴多斯',
    'tz-name-barnaul': '巴爾瑙爾',
    'tz-name-beirut': '貝魯特',
    'tz-name-belem': '貝倫',
    'tz-name-belfast': '貝爾法斯特',
    'tz-name-belgrade': '貝爾格萊德',
    'tz-name-belize': '伯利茲',
    'tz-name-berlin': '柏林',
    'tz-name-bermuda': '百慕大',
    'tz-name-beulah': '比尤拉',
    'tz-name-bishkek': '比什凱克',
    'tz-name-bissau': '幾內亞比紹',
    'tz-name-blanc-sablon': '勃朗薩布隆',
    'tz-name-blantyre': '布蘭太爾',
    'tz-name-boa-vista': '博阿維斯塔',
    'tz-name-bogota': '波哥大',
    'tz-name-boise': '博伊西',
    'tz-name-bougainville': '布幹維爾',
    'tz-name-bratislava': '布拉迪斯拉發',
    'tz-name-brazil': '巴西',
    'tz-name-brazzaville': '布拉柴維爾',
    'tz-name-brisbane': '布里斯班',
    'tz-name-broken-hill': '斷山',
    'tz-name-brunei': '文萊',
    'tz-name-brussels': '布魯塞爾',
    'tz-name-bucharest': '布加勒斯特',
    'tz-name-budapest': '布達佩斯',
    'tz-name-buenos-aires': '布宜諾斯艾利斯',
    'tz-name-bujumbura': '布瓊布拉',
    'tz-name-busingen': '布辛',
    'tz-name-cairo': '開羅',
    'tz-name-calcutta': '加爾各答',
    'tz-name-cambridge-bay': '劍橋灣',
    'tz-name-campo-grande': '大坎普 ',
    'tz-name-canada': '加拿大',
    'tz-name-canary': '加那利群島',
    'tz-name-canberra': '堪培拉',
    'tz-name-cancun': '坎昆',
    'tz-name-cape-verde': '佛得角',
    'tz-name-caracas': '加拉加斯',
    'tz-name-casablanca': '卡薩布蘭卡',
    'tz-name-casey': '卡西',
    'tz-name-catamarca': '卡塔馬卡',
    'tz-name-cayenne': '卡宴',
    'tz-name-cayman': '开曼群岛',
    'tz-name-center': '中央',
    'tz-name-central': '中央',
    'tz-name-ceuta': '休達',
    'tz-name-chagos': '查戈斯',
    'tz-name-chatham': '查塔姆',
    'tz-name-chicago': '芝加哥',
    'tz-name-chihuahua': '奇瓦瓦',
    'tz-name-chile': '智利',
    'tz-name-chisinau': '基希訥烏',
    'tz-name-chita': '赤塔',
    'tz-name-choibalsan': '喬巴山',
    'tz-name-chongqing': '重慶',
    'tz-name-christmas': '聖誕島',
    'tz-name-chungking': '重慶',
    'tz-name-chuuk': '丘克',
    'tz-name-cocos': '科科斯群島',
    'tz-name-colombo': '科倫坡',
    'tz-name-comod-rivadavia': '里瓦达维亚海军准将城',
    'tz-name-comoro': '科摩羅',
    'tz-name-conakry': '科納克里',
    'tz-name-continental': '大陸',
    'tz-name-copenhagen': '哥本哈根',
    'tz-name-coral-harbour': '珊瑚港',
    'tz-name-cordoba': '科爾多瓦',
    'tz-name-costa-rica': '哥斯達黎加',
    'tz-name-creston': '克里斯頓',
    'tz-name-cuiaba': '庫亞巴',
    'tz-name-curacao': '庫拉索',
    'tz-name-currie': '柯里',
    'tz-name-dacca': '達卡',
    'tz-name-dakar': '達喀爾',
    'tz-name-damascus': '大馬士革',
    'tz-name-danmarkshavn': '丹馬沙',
    'tz-name-dar-es-salaam': '達累斯薩拉姆',
    'tz-name-darwin': '達爾文',
    'tz-name-davis': '戴維斯',
    'tz-name-dawson': '道森',
    'tz-name-dawson-creek': '道森克里克',
    'tz-name-de-noronha': '迪诺罗尼亚群岛',
    'tz-name-denver': '丹佛',
    'tz-name-detroit': '底特律',
    'tz-name-dhaka': '達卡',
    'tz-name-dili': '帝力 ',
    'tz-name-djibouti': '吉布提',
    'tz-name-dominica': '多米尼加',
    'tz-name-douala': '杜阿拉',
    'tz-name-dubai': '迪拜',
    'tz-name-dublin': '都柏林',
    'tz-name-dumont-d-urville': '迪維爾島 ',
    'tz-name-dushanbe': '杜尚別',
    'tz-name-east': '東部',
    'tz-name-east-indiana': '東印第安納州',
    'tz-name-easter': '復活節島',
    'tz-name-easter-island': '復活節島',
    'tz-name-eastern': '東岸',
    'tz-name-edmonton': '埃德蒙頓',
    'tz-name-efate': '埃法特島',
    'tz-name-eirunepe': '埃魯內佩',
    'tz-name-el-aaiun': '艾艾恩',
    'tz-name-el-salvador': '薩爾瓦多',
    'tz-name-enderbury': '恩德伯里',
    'tz-name-ensenada': '恩塞納達',
    'tz-name-eucla': '尤克拉',
    'tz-name-europe': '歐洲',
    'tz-name-faeroe': '法羅群島',
    'tz-name-fakaofo': '法考福',
    'tz-name-famagusta': '法馬古斯塔',
    'tz-name-faroe': '法羅群島',
    'tz-name-fiji': '斐濟',
    'tz-name-fort-nelson': '納爾遜堡',
    'tz-name-fort-wayne': '韋恩堡',
    'tz-name-fortaleza': '福塔雷薩',
    'tz-name-freetown': '弗里敦',
    'tz-name-funafuti': '富納富提',
    'tz-name-gaborone': '哈博羅內',
    'tz-name-galapagos': '加拉帕戈斯',
    'tz-name-gambier': '甘比爾',
    'tz-name-gaza': '加沙',
    'tz-name-general': '一般',
    'tz-name-gibraltar': '直布羅陀',
    'tz-name-glace-bay': '格萊斯灣',
    'tz-name-godthab': '哥特哈布',
    'tz-name-goose-bay': '鵝灣',
    'tz-name-grand-turk': '大特克島',
    'tz-name-grenada': '格林納達',
    'tz-name-guadalcanal': '瓜達爾卡納爾島',
    'tz-name-guadeloupe': '瓜德羅普島',
    'tz-name-guam': '關島',
    'tz-name-guatemala': '危地馬拉',
    'tz-name-guayaquil': '瓜亞基爾',
    'tz-name-guernsey': '根西島',
    'tz-name-guyana': '圭亞那',
    'tz-name-halifax': '哈利法克斯',
    'tz-name-harare': '哈拉雷',
    'tz-name-harbin': '哈爾濱',
    'tz-name-havana': '哈瓦那',
    'tz-name-hawaii': '夏威夷',
    'tz-name-hebron': '希伯倫',
    'tz-name-helsinki': '赫爾辛基',
    'tz-name-hermosillo': '埃莫西約',
    'tz-name-ho-chi-minh': '胡志明市',
    'tz-name-hobart': '霍巴特',
    'tz-name-hong-kong': '香港',
    'tz-name-honolulu': '檀香山',
    'tz-name-hovd': '科布多',
    'tz-name-indian': '印度洋',
    'tz-name-indiana': '印地安那',
    'tz-name-indiana-starke': '印第安納州斯塔克',
    'tz-name-indianapolis': '印第安納波利斯',
    'tz-name-inuvik': '伊努維克',
    'tz-name-iqaluit': '伊卡盧伊特',
    'tz-name-irkutsk': '伊爾庫茨克',
    'tz-name-isle-of-man': '馬恩島',
    'tz-name-istanbul': '伊斯坦布爾',
    'tz-name-jakarta': '雅加達',
    'tz-name-jamaica': '牙買加',
    'tz-name-jan-mayen': '揚馬延',
    'tz-name-jayapura': '查亞普拉',
    'tz-name-jersey': '新澤西',
    'tz-name-jerusalem': '耶路撒冷',
    'tz-name-johannesburg': '約翰內斯堡',
    'tz-name-johnston': '約翰斯頓',
    'tz-name-juba': '朱巴',
    'tz-name-jujuy': '胡胡伊',
    'tz-name-juneau': '朱諾',
    'tz-name-kabul': '喀布爾',
    'tz-name-kaliningrad': '加里寧格勒',
    'tz-name-kamchatka': '堪察加',
    'tz-name-kampala': '坎帕拉',
    'tz-name-karachi': '卡拉奇',
    'tz-name-kashgar': '喀什',
    'tz-name-kathmandu': '加德滿都',
    'tz-name-katmandu': '加德滿都',
    'tz-name-kentucky': '肯塔基',
    'tz-name-kerguelen': '凱爾蓋朗',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': '喀土穆',
    'tz-name-kiev': '基輔',
    'tz-name-kigali': '基加利',
    'tz-name-kinshasa': '金沙薩',
    'tz-name-kiritimati': '克里斯馬斯',
    'tz-name-kirov': '基洛夫',
    'tz-name-knox': '諾克斯',
    'tz-name-knox-in': '印第安納州諾克斯',
    'tz-name-kolkata': '加爾各答',
    'tz-name-kosrae': '科斯雷',
    'tz-name-kralendijk': '博內爾',
    'tz-name-krasnoyarsk': '克拉斯諾亞爾斯克',
    'tz-name-kuala-lumpur': '吉隆坡',
    'tz-name-kuching': '古晉',
    'tz-name-kuwait': '科威特',
    'tz-name-kwajalein': '誇賈林',
    'tz-name-la-paz': '拉巴斯',
    'tz-name-la-rioja': '拉里奧哈',
    'tz-name-lagos': '拉各斯',
    'tz-name-lhi': '豪勳爵島',
    'tz-name-libreville': '利伯維爾',
    'tz-name-lima': '利馬',
    'tz-name-lindeman': '林德曼',
    'tz-name-lisbon': '里斯本',
    'tz-name-ljubljana': '盧布爾雅那',
    'tz-name-lome': '洛美',
    'tz-name-london': '倫敦',
    'tz-name-longyearbyen': '朗伊爾城',
    'tz-name-lord-howe': '豪勳爵',
    'tz-name-los-angeles': '洛杉磯',
    'tz-name-louisville': '路易斯維爾',
    'tz-name-lower-princes': 'Lower Prince’s Quarter',
    'tz-name-luanda': '羅安達',
    'tz-name-lubumbashi': '盧本巴希',
    'tz-name-lusaka': '盧薩卡',
    'tz-name-luxembourg': '盧森堡',
    'tz-name-macao': '澳門',
    'tz-name-macau': '澳門',
    'tz-name-maceio': '馬塞約',
    'tz-name-macquarie': '麥格理',
    'tz-name-madeira': '馬德拉',
    'tz-name-madrid': '馬德里',
    'tz-name-magadan': '馬加丹',
    'tz-name-mahe': '馬埃',
    'tz-name-majuro': '馬朱羅',
    'tz-name-makassar': '望加錫',
    'tz-name-malabo': '馬拉博',
    'tz-name-maldives': '馬爾代夫',
    'tz-name-malta': '馬耳他',
    'tz-name-managua': '馬那瓜',
    'tz-name-manaus': '馬瑙斯',
    'tz-name-manila': '馬尼拉',
    'tz-name-maputo': '馬普托',
    'tz-name-marengo': '馬倫戈',
    'tz-name-mariehamn': '馬利漢姆',
    'tz-name-marigot': '馬里戈特',
    'tz-name-marquesas': '馬克薩斯',
    'tz-name-martinique': '馬提尼克',
    'tz-name-maseru': '馬塞盧',
    'tz-name-matamoros': '馬塔莫羅斯',
    'tz-name-mauritius': '毛里求斯',
    'tz-name-mawson': '莫森',
    'tz-name-mayotte': '馬約特',
    'tz-name-mazatlan': '馬薩特蘭',
    'tz-name-mbabane': '姆巴巴',
    'tz-name-mc-murdo': '麥克默多',
    'tz-name-melbourne': '墨爾本',
    'tz-name-mendoza': '門多薩',
    'tz-name-menominee': '梅諾米尼',
    'tz-name-merida': '梅里達',
    'tz-name-metlakatla': '梅特拉卡特拉',
    'tz-name-mexico': '墨西哥',
    'tz-name-mexico-city': '墨西哥城',
    'tz-name-michigan': '密歇根州',
    'tz-name-midway': '中途島',
    'tz-name-minsk': '明斯克',
    'tz-name-miquelon': '密克隆',
    'tz-name-mogadishu': '摩加迪沙',
    'tz-name-monaco': '摩納哥',
    'tz-name-moncton': '蒙克頓',
    'tz-name-monrovia': '蒙羅維亞',
    'tz-name-monterrey': '蒙特雷',
    'tz-name-montevideo': '蒙得維的亞',
    'tz-name-monticello': '蒙蒂塞洛',
    'tz-name-montreal': '蒙特利爾',
    'tz-name-montserrat': '蒙特塞拉特',
    'tz-name-moscow': '莫斯科',
    'tz-name-mountain': '山區',
    'tz-name-muscat': '馬斯喀特',
    'tz-name-nairobi': '內羅畢',
    'tz-name-nassau': '拿騷',
    'tz-name-nauru': '瑙魯',
    'tz-name-ndjamena': '恩賈梅納',
    'tz-name-new-salem': '新塞勒姆',
    'tz-name-new-york': '紐約',
    'tz-name-newfoundland': '紐芬蘭',
    'tz-name-niamey': '尼亞美',
    'tz-name-nicosia': '尼科西亞',
    'tz-name-nipigon': '尼皮貢',
    'tz-name-niue': '紐埃',
    'tz-name-nome': '諾姆',
    'tz-name-norfolk': '諾福克',
    'tz-name-noronha': '迪諾羅尼亞',
    'tz-name-north': '北部',
    'tz-name-north-dakota': '北達科他州',
    'tz-name-nouakchott': '努瓦克肖特',
    'tz-name-noumea': '努美阿',
    'tz-name-novokuznetsk': '新庫茲涅茨克',
    'tz-name-novosibirsk': '新西伯利亞',
    'tz-name-nsw': '新南威爾士州',
    'tz-name-ojinaga': '奧希納加',
    'tz-name-omsk': '鄂木斯克',
    'tz-name-oral': '烏拉爾 ',
    'tz-name-oslo': '奧斯陸',
    'tz-name-ouagadougou': '瓦加杜古',
    'tz-name-pacific': '太平洋',
    'tz-name-pacific-new': '太平洋新',
    'tz-name-pago-pago': '帕果帕果',
    'tz-name-palau': '帕勞',
    'tz-name-palmer': '帕爾默',
    'tz-name-panama': '巴拿馬',
    'tz-name-pangnirtung': '龐納唐',
    'tz-name-paramaribo': '帕拉馬里博',
    'tz-name-paris': '巴黎',
    'tz-name-perth': '珀斯',
    'tz-name-petersburg': '聖彼得堡',
    'tz-name-phnom-penh': '金邊',
    'tz-name-phoenix': '鳳凰',
    'tz-name-pitcairn': '皮特凱恩',
    'tz-name-podgorica': '波德戈里察',
    'tz-name-pohnpei': '波納佩',
    'tz-name-ponape': '波納佩',
    'tz-name-pontianak': '坤甸',
    'tz-name-port-au-prince': '太子港',
    'tz-name-port-moresby': '莫爾茲比港',
    'tz-name-port-of-spain': '西班牙港',
    'tz-name-porto-acre': '波爾圖阿克',
    'tz-name-porto-novo': '波多諾伏',
    'tz-name-porto-velho': '波多韋柳',
    'tz-name-prague': '布拉格',
    'tz-name-puerto-rico': '波多黎各',
    'tz-name-punta-arenas': '蓬塔阿雷納斯',
    'tz-name-pyongyang': '平壤',
    'tz-name-qatar': '卡塔爾',
    'tz-name-qostanay': '科斯塔奈',
    'tz-name-queensland': '昆士蘭',
    'tz-name-qyzylorda': '克孜勒奧爾達',
    'tz-name-rainy-river': '雷尼',
    'tz-name-rangoon': '仰光',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': '拉羅湯加島',
    'tz-name-recife': '累西腓',
    'tz-name-regina': '里賈納',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': '留尼汪',
    'tz-name-reykjavik': '雷克雅未克',
    'tz-name-riga': '裡加',
    'tz-name-rio-branco': '里約布蘭科',
    'tz-name-rio-gallegos': '里奥加耶戈斯',
    'tz-name-riyadh': '利雅得',
    'tz-name-rome': '羅馬',
    'tz-name-rosario': '羅薩里奧',
    'tz-name-rothera': '羅瑟拉',
    'tz-name-saigon': '西貢',
    'tz-name-saipan': '塞班',
    'tz-name-sakhalin': '薩哈林',
    'tz-name-salta': '薩爾塔',
    'tz-name-samara': '薩馬拉',
    'tz-name-samarkand': '撒馬爾罕',
    'tz-name-samoa': '薩摩亞',
    'tz-name-san-juan': '聖胡安',
    'tz-name-san-luis': '聖路易斯',
    'tz-name-san-marino': '聖馬力諾',
    'tz-name-santa-isabel': '聖伊莎貝爾',
    'tz-name-santarem': '聖塔倫',
    'tz-name-santiago': '聖地亞哥',
    'tz-name-santo-domingo': '聖多明各',
    'tz-name-sao-paulo': '聖保羅',
    'tz-name-sao-tome': '聖多美',
    'tz-name-sarajevo': '薩拉熱窩',
    'tz-name-saratov': '薩拉托夫',
    'tz-name-saskatchewan': '薩斯喀徹溫省',
    'tz-name-scoresbysund': '史科斯',
    'tz-name-seoul': '漢城',
    'tz-name-shanghai': '上海',
    'tz-name-shiprock': '希普羅克',
    'tz-name-simferopol': '辛菲羅波爾',
    'tz-name-singapore': '新加坡',
    'tz-name-sitka': '錫特卡',
    'tz-name-skopje': '斯科普里',
    'tz-name-sofia': '蘇菲亞',
    'tz-name-south': '南部',
    'tz-name-south-georgia': '南喬治亞州',
    'tz-name-south-pole': '南極',
    'tz-name-srednekolymsk': '中科雷姆斯克',
    'tz-name-st-barthelemy': '聖巴泰勒米',
    'tz-name-st-helena': '聖赫勒拿島',
    'tz-name-st-johns': '聖約翰斯',
    'tz-name-st-kitts': '聖基茨',
    'tz-name-st-lucia': '聖露西亞',
    'tz-name-st-thomas': '聖托馬斯',
    'tz-name-st-vincent': '聖文森特',
    'tz-name-stanley': '斯坦利',
    'tz-name-stockholm': '斯德哥爾摩',
    'tz-name-swift-current': '斯威夫特卡伦特',
    'tz-name-sydney': '悉尼',
    'tz-name-syowa': '昭和',
    'tz-name-tahiti': '大溪地',
    'tz-name-taipei': '台北',
    'tz-name-tallinn': '塔林',
    'tz-name-tarawa': '塔拉瓦',
    'tz-name-tashkent': '塔什幹',
    'tz-name-tasmania': '塔斯馬尼亞',
    'tz-name-tbilisi': '第比利斯',
    'tz-name-tegucigalpa': '特古西加爾巴',
    'tz-name-tehran': '德黑蘭',
    'tz-name-tel-aviv': '特拉維夫',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': '廷布',
    'tz-name-thimphu': '廷布',
    'tz-name-thule': '圖勒',
    'tz-name-thunder-bay': '桑德灣',
    'tz-name-tijuana': '蒂華納',
    'tz-name-timbuktu': '廷巴克圖',
    'tz-name-tirane': '地拉那',
    'tz-name-tiraspol': '蒂拉斯波爾',
    'tz-name-tokyo': '東京',
    'tz-name-tomsk': '托木斯克',
    'tz-name-tongatapu': '湯加塔布',
    'tz-name-toronto': '多倫多',
    'tz-name-tortola': '托爾托拉',
    'tz-name-tripoli': '的黎波里',
    'tz-name-troll': 'Troll',
    'tz-name-truk': '特魯克',
    'tz-name-tucuman': '圖庫曼',
    'tz-name-tunis': '突尼斯',
    'tz-name-ujung-pandang': '望加锡',
    'tz-name-ulaanbaatar': '烏蘭巴托',
    'tz-name-ulan-bator': '烏蘭巴托',
    'tz-name-ulyanovsk': '烏里揚諾夫斯克',
    'tz-name-urumqi': '烏魯木齊',
    'tz-name-us': '美國',
    'tz-name-ushuaia': '烏斯懷亞',
    'tz-name-ust-nera': '烏斯季挪拉',
    'tz-name-uzhgorod': '烏日哥羅德',
    'tz-name-vaduz': '瓦杜茲',
    'tz-name-vancouver': '溫哥華',
    'tz-name-vatican': '教廷',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': '維多利亞',
    'tz-name-vienna': '維也納',
    'tz-name-vientiane': '萬象',
    'tz-name-vilnius': '維爾紐斯',
    'tz-name-vincennes': '文森斯',
    'tz-name-virgin': '維爾京群島',
    'tz-name-vladivostok': '符拉迪沃斯托克',
    'tz-name-volgograd': '伏爾加格勒',
    'tz-name-vostok': '沃斯托克',
    'tz-name-wake': '威克島',
    'tz-name-wallis': '沃利斯',
    'tz-name-warsaw': '華沙',
    'tz-name-west': '西部',
    'tz-name-whitehorse': '白馬',
    'tz-name-winamac': '威納馬克',
    'tz-name-windhoek': '溫得和克',
    'tz-name-winnipeg': '溫尼伯',
    'tz-name-yakutat': '亞庫塔特',
    'tz-name-yakutsk': '雅庫茨克',
    'tz-name-yancowinna': '揚科維納',
    'tz-name-yangon': '仰光',
    'tz-name-yap': '雅浦',
    'tz-name-yekaterinburg': '葉卡捷琳堡',
    'tz-name-yellowknife': '耶洛奈夫',
    'tz-name-yerevan': '埃里溫',
    'tz-name-yukon': '育空',
    'tz-name-zagreb': '薩格勒布',
    'tz-name-zaporozhye': '扎波羅熱',
    'tz-name-zurich': '蘇黎世',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinalT(count, '一個文件');
        return `上傳${files}，剩下${size}`;
    },

    'user-list-add': '添加用戶',
    'user-list-approve-all': '批准所有請求',
    'user-list-cancel': '取消',
    'user-list-column-email': '電子郵件地址',
    'user-list-column-last-modified': '上次修改時間',
    'user-list-column-name': '名稱',
    'user-list-column-projects': '項目',
    'user-list-column-roles': '角色',
    'user-list-column-type': '類型',
    'user-list-column-username': '用戶名',
    'user-list-confirm-disable-$count': (count) => {
        let users = cardinalT(count, '這個用戶', '這三個用戶');
        return `你確定要關閉${user}？`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let users = cardinalT(count, '這個用戶', '這三個用戶');
        return `你確定要恢復${users}？`;
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
        let text = '用戶';
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
        let text = '成員';
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
    'user-summary-remove-membership': '將用戶從項目刪除',
    'user-summary-restore-membership': '將用戶添加到項目',
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

    'user-tooltip-$count': (count) => {
        return cardinalT(count, '一個用戶');
    },

    'validation-duplicate-project-name': '具有該標識符的項目已經存在',
    'validation-duplicate-role-name': '具有該標識符的角色已經存在',
    'validation-duplicate-server-name': '具有該標識符的服務器已經存在',
    'validation-duplicate-source-name': '具有該標識符的數據源已經存在',
    'validation-duplicate-spreadsheet-name': '具有該標識符的鏈接已經存在',
    'validation-duplicate-user-name': '具有該用戶名的用戶已經存在',
    'validation-illegal-project-name': '項目標識符不能是《global》，《admin》，《public》，或《srv》',
    'validation-invalid-timezone': '不正確的時區',
    'validation-localhost-is-wrong': '《localhost》是不正確的',
    'validation-password-for-admin-only': '只有管理員可以使用密碼登錄',
    'validation-required': '需要',
    'validation-used-by-trambar': '由電車吧使用',

    'website-summary-cancel': '取消',
    'website-summary-domain-names': '網站域名',
    'website-summary-edit': '編輯網站',
    'website-summary-save': '保存網站',
    'website-summary-template': '網站模板',
    'website-summary-template-disabled': '不使用網站',
    'website-summary-template-generic': '通用模板',
    'website-summary-timezone': '時區',
    'website-summary-title': '網站',
    'website-summary-traffic-report-time': '交通報告發佈時間',
    'website-summary-versions': '版本',

    'welcome': '歡迎!',

    'wiki-list-cancel': '取消',
    'wiki-list-column-last-modified': '上次修改時間',
    'wiki-list-column-public': '公開',
    'wiki-list-column-repo': '數據庫',
    'wiki-list-column-title': '標題',
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, '此頁面', '這三頁');
        return `你確定要取消選擇${pages}嗎？`;
    },
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, '此頁面', '這三頁');
        return `你確定要將${pages}公開嗎？`;
    },
    'wiki-list-edit': '編輯頁面列表',
    'wiki-list-public-always': '總是',
    'wiki-list-public-no': '不是',
    'wiki-list-public-referenced': '鏈接',
    'wiki-list-save': '保存頁面列表',
    'wiki-list-title': 'GitLab維基',

    'wiki-summary-$title': (title) => {
        let text = 'GitLab維基';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': '取消',
    'wiki-summary-confirm-deselect': '你確定要取消選擇此頁面嗎？',
    'wiki-summary-confirm-select': '你確定要將此頁面公開嗎？',
    'wiki-summary-deselect': '取消選擇頁面',
    'wiki-summary-edit': '編輯頁面',
    'wiki-summary-hidden': '搜索',
    'wiki-summary-hidden-false': '出現在搜索結果中',
    'wiki-summary-hidden-true': '不會在搜索結果中出現',
    'wiki-summary-page-contents': '內容',
    'wiki-summary-public': '公開',
    'wiki-summary-public-always': '總是',
    'wiki-summary-public-no': '不是',
    'wiki-summary-public-referenced': '是（由另一個公共頁面鏈接）',
    'wiki-summary-repo': '存儲庫標識符',
    'wiki-summary-return': '返回頁面列表',
    'wiki-summary-save': '保存頁面',
    'wiki-summary-select': '選擇頁面',
    'wiki-summary-slug': 'Slug',
    'wiki-summary-title': '標題',
};

const simplifiedPhrases = {
    'action-badge-add': '会添加',
    'action-badge-approve': '会批准',
    'action-badge-archive': '会归档',
    'action-badge-deselect': '取消',
    'action-badge-disable': '会停用',
    'action-badge-reactivate': '会启用',
    'action-badge-remove': '会删除',
    'action-badge-restore': '会恢复',
    'action-badge-select': '选择',

    'activity-chart-legend-branch': '分支',
    'activity-chart-legend-issue': '问题',
    'activity-chart-legend-member': '成员变更',
    'activity-chart-legend-merge': '代码合并',
    'activity-chart-legend-merge-request': '合并请求',
    'activity-chart-legend-milestone': '里程碑',
    'activity-chart-legend-post': '贴文',
    'activity-chart-legend-push': '推送',
    'activity-chart-legend-repo': '数据库修改',
    'activity-chart-legend-snapshot': '网站修订',
    'activity-chart-legend-survey': '调查',
    'activity-chart-legend-tag': '标签',
    'activity-chart-legend-task-list': '任务列表',
    'activity-chart-legend-website-traffic': '网站流量报告',
    'activity-chart-legend-wiki': 'wiki修改',

    'activity-tooltip-$count': (count) => {
        return `${count}个故事`;
    },
    'activity-tooltip-$count-branch': (count) => {
        return `${count}个分支`;
    },
    'activity-tooltip-$count-issue': (count) => {
        return `${count}个问题`;
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
        return `${count}个里程碑`;
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
    'activity-tooltip-$count-snapshot': (count) => {
        return `${count}个网站修订`;
    },
    'activity-tooltip-$count-survey': (count) => {
        return `${count}个调查`;
    },
    'activity-tooltip-$count-tag': (count) => {
        return `${count}个标签`;
    },
    'activity-tooltip-$count-task-list': (count) => {
        return `${count}个任务列表`;
    },
    'activity-tooltip-$count-website-traffic': (count) => {
        return `${count}个网站流量报告`;
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

    'image-preview-close': '关闭',
    'image-preview-dropbox': 'Dropbox',
    'image-preview-onedrive': 'OneDrive',

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
    'member-list-column-date-range': '活动期间',
    'member-list-column-email': '电子邮件地址',
    'member-list-column-last-modified': '上次修改时间',
    'member-list-column-last-month': '上个月',
    'member-list-column-name': '名称',
    'member-list-column-roles': '角色',
    'member-list-column-this-month': '本月',
    'member-list-column-to-date': '至今',
    'member-list-column-type': '类型',
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
    'nav-rest-source-new': '新数据源',
    'nav-rest-sources': 'REST数据源',
    'nav-role-new': '新角色',
    'nav-roles': '角色',
    'nav-server-new': '新服务器',
    'nav-servers': '服务器',
    'nav-settings': '设置',
    'nav-spreadsheet-new': '新文件',
    'nav-spreadsheets': 'Excel文件',
    'nav-user-new': '新用户',
    'nav-users': '用户',
    'nav-website': '网站',
    'nav-wiki': 'GitLab维基',

    'project-list-add': '添加项目',
    'project-list-cancel': '取消',
    'project-list-column-date-range': '活动期间',
    'project-list-column-last-modified': '上次修改时间',
    'project-list-column-last-month': '上个月',
    'project-list-column-repositories': '数据库',
    'project-list-column-this-month': '本月',
    'project-list-column-title': '名称',
    'project-list-column-to-date': '至今',
    'project-list-column-users': '用户',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinalS(count, '这个项目', '这三个项目');
        return `你确定要存档${projects}？`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinalS(count, '这个项目', '这三个项目');
        return `你确定要恢复${projects}？`;
    },
    'project-list-edit': '编辑项目列表',
    'project-list-save': '保存项目列表',
    'project-list-status-archived': '已存档',
    'project-list-status-deleted': '已删除',
    'project-list-title': '项目',

    'project-summary-$title': (title) => {
        let text = '项目';
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
        return cardinalS(count, '还有一个');
    },

    'repo-list-cancel': '取消',
    'repo-list-column-date-range': '活动期间',
    'repo-list-column-issue-tracker': '问题追踪器',
    'repo-list-column-last-modified': '上次修改时间',
    'repo-list-column-last-month': '上个月',
    'repo-list-column-server': '服务器',
    'repo-list-column-this-month': '本月',
    'repo-list-column-title': '名称',
    'repo-list-column-to-date': '至今',
    'repo-list-confirm-remove-$count': (count) => {
        let repos = cardinalS(count, '这个数据库', '这三个数据库');
        return `你确定要从项目解除${repos}？`;
    },
    'repo-list-edit': '编辑数据库列表',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': '启用',
    'repo-list-save': '保存数据库列表',
    'repo-list-title': '数据库',

    'repo-summary-$title': (title) => {
        let text = `数据库`;
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
        return cardinalS(count, '一个数据库');
    },

    'rest-list-add': '添加新数据源',
    'rest-list-cancel': '取消',
    'rest-list-column-identifier': '识别码',
    'rest-list-column-last-modified': '上次修改时间',
    'rest-list-column-type': '类型',
    'rest-list-column-url': 'URL',
    'rest-list-confirm-disable-$count': (count) => {
        let sources = cardinal(count, '此数据源', '这三个数据源');
        return `你确定要停用${sources}吗？ `;
    },
    'rest-list-confirm-reactivate-$count': (count) => {
        let sources = cardinal(count, '此数据源', '这三个数据源');
        return `你确定要重新启用${sources}吗？ `;
    },
    'rest-list-edit': '编辑数据源列表',
    'rest-list-save': '保存数据源列表',
    'rest-list-status-deleted': '已删除',
    'rest-list-status-disabled': '已停用',
    'rest-list-title': 'REST数据源',

    'rest-summary-$title': (title) => {
        let text = 'REST数据源';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'rest-summary-add': '添加新数据源',
    'rest-summary-cancel': '取消',
    'rest-summary-confirm-delete': '你确定要删除此数据源吗？',
    'rest-summary-confirm-disable': '你确定要停用此数据源吗？',
    'rest-summary-confirm-reactivate': '你确定要重新启用此数据源吗？ ',
    'rest-summary-delete': '删除数据源',
    'rest-summary-description': '描述',
    'rest-summary-disable': '停用数据源',
    'rest-summary-edit': '编辑数据源',
    'rest-summary-max-age': '数据最大年龄',
    'rest-summary-name': '识别码',
    'rest-summary-reactivate': '重新启用数据源',
    'rest-summary-return': '返回数据源列表',
    'rest-summary-save': '保存数据源',
    'rest-summary-type': '类型',
    'rest-summary-url': 'URL',

    'rest-type-generic': '通用',
    'rest-type-wordpress': 'WordPress',

    'role-list-add': '添加角色',
    'role-list-cancel': '取消',
    'role-list-column-last-modified': '上次修改时间',
    'role-list-column-title': '名称',
    'role-list-column-users': '用户',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinalS(count, '这个角色', '这三个角色');
        return `你确定要停用${roles}？`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinalS(count, '这个角色', '这三个角色');
        return `你确定要启用${roles}？`;
    },
    'role-list-edit': '编辑角色列表',
    'role-list-save': '保存角色列表',
    'role-list-status-deleted': '已删除',
    'role-list-status-disabled': '已停用',
    'role-list-title': '角色',

    'role-summary-$title': (title) => {
        let text = '角色';
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
        return cardinalS(count, '还有一个');
    },

    'server-list-add': '添加服务器',
    'server-list-api-access-false': '',
    'server-list-api-access-true': '已取得',
    'server-list-cancel': '取消',
    'server-list-column-api-access': 'API访问﻿',
    'server-list-column-last-modified': '上次修改时间',
    'server-list-column-oauth': 'OAuth认证',
    'server-list-column-title': '名称',
    'server-list-column-type': '类型',
    'server-list-column-users': '用户',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinalS(count, '这个服务器', '这三个服务器')
        return `你确定要停用${servers}？`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinalS(count, '这个服务器', '这三个服务器')
        return `你确定要启用${servers}？`;
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
    'server-summary-gitlab-regular-user': 'GitLab普通用户',
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
    'server-summary-oauth-callback-url': '回调URL',
    'server-summary-oauth-client-id': '客户端ID',
    'server-summary-oauth-client-secret': '客户端秘密',
    'server-summary-oauth-deauthorize-callback-url': '取消授权的回调URL',
    'server-summary-oauth-gitlab-url': 'GitLab URL',
    'server-summary-oauth-redirect-uri': '重定向URL',
    'server-summary-oauth-redirect-url': '重定向URL',
    'server-summary-oauth-site-url': '网站URL',
    'server-summary-privacy-policy-url': '隐私政策URL',
    'server-summary-reactivate': '启用服务器',
    'server-summary-return': '返回到服务器列表',
    'server-summary-role-none': '不要将任何角色分配给新用户',
    'server-summary-roles': '角色分配',
    'server-summary-save': '保存服务器',
    'server-summary-system-address-missing': '系统网址尚未设置',
    'server-summary-terms-and-conditions-url': '条款和条件URL',
    'server-summary-test-oauth': '测试OAuth集成',
    'server-summary-title': '名称',
    'server-summary-type': '服务器类型',
    'server-summary-user-automatic-approval': '自动批准新用户',
    'server-summary-user-import-disabled': '不要注册新用户',
    'server-summary-user-import-gitlab-admin-disabled': '不要导入GitLab管理员',
    'server-summary-user-import-gitlab-external-user-disabled': '不要导入GitLab外部用户',
    'server-summary-user-import-gitlab-user-disabled': '不要导入GitLab普通用户',
    'server-summary-user-type-admin': '管理员',
    'server-summary-user-type-guest': '访客用户',
    'server-summary-user-type-moderator': '检查员',
    'server-summary-user-type-regular': '普通用户',
    'server-summary-whitelist': '电子邮件地址白名单',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': '背景图',
    'settings-cancel': '取消',
    'settings-company-name': '公司名',
    'settings-edit': '编辑设置',
    'settings-input-languages': '输入语言',
    'settings-push-relay': 'Push通知中继网址',
    'settings-save': '保存设置',
    'settings-site-address': '网址',
    'settings-site-description': '描述',
    'settings-site-title': '网站名称',
    'settings-title': '设置',

    'sign-in-$title': (title) => {
        let text = `登录`;
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

    'spreadsheet-list-add': '添加新链接',
    'spreadsheet-list-cancel': '取消',
    'spreadsheet-list-column-filename': '文件名',
    'spreadsheet-list-column-last-modified': '上次修改时间',
    'spreadsheet-list-column-sheets': '表格',
    'spreadsheet-list-column-url': 'URL',
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, '此链接', '这两个链接');
        return `你确定要停用${spreadsheets}吗？ `;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, '此链接', '这两个链接');
        return `你确定要重新启用${spreadsheets}吗？ `;
    },
    'spreadsheet-list-edit': '编辑链接列表',
    'spreadsheet-list-save': '保存链接列表',
    'spreadsheet-list-status-deleted': '已删除',
    'spreadsheet-list-status-disabled': '已停用',
    'spreadsheet-list-title': 'Excel文件',

    'spreadsheet-summary-$title': (title) => {
        let text = 'Excel文件';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': '添加新链接',
    'spreadsheet-summary-cancel': '取消',
    'spreadsheet-summary-confirm-delete': '你确定要删除此链接吗？ ',
    'spreadsheet-summary-confirm-disable': '你确定要停用此链接吗？ ',
    'spreadsheet-summary-confirm-reactivate': '你确定要重新启用此链接吗？ ',
    'spreadsheet-summary-delete': '删除链接',
    'spreadsheet-summary-description': '描述',
    'spreadsheet-summary-disable': '停用链接',
    'spreadsheet-summary-edit': '编辑链接',
    'spreadsheet-summary-filename': '文件名',
    'spreadsheet-summary-hidden': '搜索',
    'spreadsheet-summary-hidden-false': '出现在搜索结果中',
    'spreadsheet-summary-hidden-true': '不会在搜索结果中出现',
    'spreadsheet-summary-name': '识别码',
    'spreadsheet-summary-reactivate': '重新启用链接',
    'spreadsheet-summary-return': '返回链接列表',
    'spreadsheet-summary-save': '保存链接',
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `表格${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': '标题',
    'spreadsheet-summary-url': 'URL',

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
        return `安装了${count}个挂钩`;
    },
    'task-installing-hooks': '安装挂钩',
    'task-removed-$count-hooks': (count) => {
        return `卸载了${count}个挂钩`;
    },
    'task-removed-$count-repos': (count) => {
        return `删除了${count}个数据库`;
    },
    'task-removed-$count-users': (count) => {
        return `删除了${count}个用户`;
    },
    'task-removing-hooks': '卸载挂钩',
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

    'tz-name-abidjan': '阿比让',
    'tz-name-accra': '阿克拉',
    'tz-name-acre': '阿克里',
    'tz-name-act': '澳大利亚首都直辖区',
    'tz-name-adak': '埃达克',
    'tz-name-addis-ababa': '亚的斯亚贝巴',
    'tz-name-adelaide': '阿德莱德',
    'tz-name-aden': '亚丁',
    'tz-name-africa': '非洲',
    'tz-name-alaska': '阿拉斯加州',
    'tz-name-aleutian': '阿留申',
    'tz-name-algiers': '阿尔及尔',
    'tz-name-almaty': '阿拉木图',
    'tz-name-america': '美洲',
    'tz-name-amman': '安曼',
    'tz-name-amsterdam': '阿姆斯特丹',
    'tz-name-anadyr': '阿纳德尔',
    'tz-name-anchorage': '安克雷奇',
    'tz-name-andorra': '安道尔',
    'tz-name-anguilla': '安圭拉',
    'tz-name-antananarivo': '塔那那利佛',
    'tz-name-antarctica': '南极洲',
    'tz-name-antigua': '安提瓜',
    'tz-name-apia': '阿皮亚',
    'tz-name-aqtau': '阿克陶',
    'tz-name-aqtobe': '阿克托别',
    'tz-name-araguaina': '阿拉圭纳',
    'tz-name-arctic': '北极',
    'tz-name-argentina': '阿根廷',
    'tz-name-arizona': '亚利桑那',
    'tz-name-aruba': '阿鲁巴',
    'tz-name-ashgabat': '阿什哈巴德',
    'tz-name-ashkhabad': '阿什哈巴德',
    'tz-name-asia': '亚洲',
    'tz-name-asmara': '阿斯马拉',
    'tz-name-asmera': '阿斯马拉',
    'tz-name-astrakhan': '阿斯特拉罕',
    'tz-name-asuncion': '亚松森',
    'tz-name-athens': '雅典',
    'tz-name-atikokan': '阿蒂科肯',
    'tz-name-atka': '阿特卡',
    'tz-name-atlantic': '大西洋',
    'tz-name-atyrau': '阿特劳',
    'tz-name-auckland': '奥克兰',
    'tz-name-australia': '澳大利亚',
    'tz-name-azores': '亚速尔群岛',
    'tz-name-baghdad': '巴格达',
    'tz-name-bahia': '巴伊亚',
    'tz-name-bahia-banderas': '巴伊亚班德拉斯',
    'tz-name-bahrain': '巴林',
    'tz-name-baja-norte': '北下加利福尼亚',
    'tz-name-baja-sur': '南下加利福尼亚',
    'tz-name-baku': '巴库',
    'tz-name-bamako': '巴马科',
    'tz-name-bangkok': '曼谷',
    'tz-name-bangui': '班吉',
    'tz-name-banjul': '班珠尔',
    'tz-name-barbados': '巴巴多斯',
    'tz-name-barnaul': '巴尔瑙尔',
    'tz-name-beirut': '贝鲁特',
    'tz-name-belem': '贝伦',
    'tz-name-belfast': '贝尔法斯特',
    'tz-name-belgrade': '贝尔格莱德',
    'tz-name-belize': '伯利兹',
    'tz-name-berlin': '柏林',
    'tz-name-bermuda': '百慕大',
    'tz-name-beulah': '比尤拉',
    'tz-name-bishkek': '比什凯克',
    'tz-name-bissau': '几内亚比绍',
    'tz-name-blanc-sablon': '勃朗萨布隆',
    'tz-name-blantyre': '布兰太尔',
    'tz-name-boa-vista': '博阿维斯塔',
    'tz-name-bogota': '波哥大',
    'tz-name-boise': '博伊西',
    'tz-name-bougainville': '布干维尔',
    'tz-name-bratislava': '布拉迪斯拉发',
    'tz-name-brazil': '巴西',
    'tz-name-brazzaville': '布拉柴维尔',
    'tz-name-brisbane': '布里斯班',
    'tz-name-broken-hill': '断山',
    'tz-name-brunei': '文莱',
    'tz-name-brussels': '布鲁塞尔',
    'tz-name-bucharest': '布加勒斯特',
    'tz-name-budapest': '布达佩斯',
    'tz-name-buenos-aires': '布宜诺斯艾利斯',
    'tz-name-bujumbura': '布琼布拉',
    'tz-name-busingen': '布辛',
    'tz-name-cairo': '开罗',
    'tz-name-calcutta': '加尔各答',
    'tz-name-cambridge-bay': '剑桥湾',
    'tz-name-campo-grande': '大坎普',
    'tz-name-canada': '加拿大',
    'tz-name-canary': '加那利群岛',
    'tz-name-canberra': '堪培拉',
    'tz-name-cancun': '坎昆',
    'tz-name-cape-verde': '佛得角',
    'tz-name-caracas': '加拉加斯',
    'tz-name-casablanca': '卡萨布兰卡',
    'tz-name-casey': '卡西',
    'tz-name-catamarca': '卡塔马卡',
    'tz-name-cayenne': '卡宴',
    'tz-name-cayman': '开曼群岛',
    'tz-name-center': '中央',
    'tz-name-central': '中央',
    'tz-name-ceuta': '休达',
    'tz-name-chagos': '查戈斯',
    'tz-name-chatham': '查塔姆',
    'tz-name-chicago': '芝加哥',
    'tz-name-chihuahua': '奇瓦瓦',
    'tz-name-chile': '智利',
    'tz-name-chisinau': '基希讷乌',
    'tz-name-chita': '赤塔',
    'tz-name-choibalsan': '乔巴山',
    'tz-name-chongqing': '重庆',
    'tz-name-christmas': '圣诞岛',
    'tz-name-chungking': '重庆',
    'tz-name-chuuk': '丘克',
    'tz-name-cocos': '科科斯群岛',
    'tz-name-colombo': '科伦坡',
    'tz-name-comod-rivadavia': '里瓦达维亚海军准将城',
    'tz-name-comoro': '科摩罗',
    'tz-name-conakry': '科纳克里',
    'tz-name-continental': '大陆',
    'tz-name-copenhagen': '哥本哈根',
    'tz-name-coral-harbour': '珊瑚港',
    'tz-name-cordoba': '科尔多瓦',
    'tz-name-costa-rica': '哥斯达黎加',
    'tz-name-creston': '克里斯顿',
    'tz-name-cuiaba': '库亚巴',
    'tz-name-curacao': '库拉索',
    'tz-name-currie': '柯里',
    'tz-name-dacca': '达卡',
    'tz-name-dakar': '达喀尔',
    'tz-name-damascus': '大马士革',
    'tz-name-danmarkshavn': '丹马沙',
    'tz-name-dar-es-salaam': '达累斯萨拉姆',
    'tz-name-darwin': '达尔文',
    'tz-name-davis': '戴维斯',
    'tz-name-dawson': '道森',
    'tz-name-dawson-creek': '道森克里克',
    'tz-name-de-noronha': '迪诺罗尼亚群岛',
    'tz-name-denver': '丹佛',
    'tz-name-detroit': '底特律',
    'tz-name-dhaka': '达卡',
    'tz-name-dili': '帝力',
    'tz-name-djibouti': '吉布提',
    'tz-name-dominica': '多米尼加',
    'tz-name-douala': '杜阿拉',
    'tz-name-dubai': '迪拜',
    'tz-name-dublin': '都柏林',
    'tz-name-dumont-d-urville': '迪维尔岛',
    'tz-name-dushanbe': '杜尚别',
    'tz-name-east': '东部',
    'tz-name-east-indiana': '东印第安纳州',
    'tz-name-easter': '复活节岛',
    'tz-name-easter-island': '复活节岛',
    'tz-name-eastern': '东岸',
    'tz-name-edmonton': '埃德蒙顿',
    'tz-name-efate': '埃法特岛',
    'tz-name-eirunepe': '埃鲁内佩',
    'tz-name-el-aaiun': '艾艾恩',
    'tz-name-el-salvador': '萨尔瓦多',
    'tz-name-enderbury': '恩德伯里',
    'tz-name-ensenada': '恩塞纳达',
    'tz-name-eucla': '尤克拉',
    'tz-name-europe': '欧洲',
    'tz-name-faeroe': '法罗群岛',
    'tz-name-fakaofo': '法考福',
    'tz-name-famagusta': '法马古斯塔',
    'tz-name-faroe': '法罗群岛',
    'tz-name-fiji': '斐济',
    'tz-name-fort-nelson': '纳尔逊堡',
    'tz-name-fort-wayne': '韦恩堡',
    'tz-name-fortaleza': '福塔雷萨',
    'tz-name-freetown': '弗里敦',
    'tz-name-funafuti': '富纳富提',
    'tz-name-gaborone': '哈博罗内',
    'tz-name-galapagos': '加拉帕戈斯',
    'tz-name-gambier': '甘比尔',
    'tz-name-gaza': '加沙',
    'tz-name-general': '一般',
    'tz-name-gibraltar': '直布罗陀',
    'tz-name-glace-bay': '格莱斯湾',
    'tz-name-godthab': '哥特哈布',
    'tz-name-goose-bay': '鹅湾',
    'tz-name-grand-turk': '大特克岛',
    'tz-name-grenada': '格林纳达',
    'tz-name-guadalcanal': '瓜达尔卡纳尔岛',
    'tz-name-guadeloupe': '瓜德罗普岛',
    'tz-name-guam': '关岛',
    'tz-name-guatemala': '危地马拉',
    'tz-name-guayaquil': '瓜亚基尔',
    'tz-name-guernsey': '根西岛',
    'tz-name-guyana': '圭亚那',
    'tz-name-halifax': '哈利法克斯',
    'tz-name-harare': '哈拉雷',
    'tz-name-harbin': '哈尔滨',
    'tz-name-havana': '哈瓦那',
    'tz-name-hawaii': '夏威夷',
    'tz-name-hebron': '希伯伦',
    'tz-name-helsinki': '赫尔辛基',
    'tz-name-hermosillo': '埃莫西约',
    'tz-name-ho-chi-minh': '胡志明市',
    'tz-name-hobart': '霍巴特',
    'tz-name-hong-kong': '香港',
    'tz-name-honolulu': '檀香山',
    'tz-name-hovd': '科布多',
    'tz-name-indian': '印度洋',
    'tz-name-indiana': '印地安那',
    'tz-name-indiana-starke': '印第安纳州斯塔克',
    'tz-name-indianapolis': '印第安纳波利斯',
    'tz-name-inuvik': '伊努维克',
    'tz-name-iqaluit': '伊卡卢伊特',
    'tz-name-irkutsk': '伊尔库茨克',
    'tz-name-isle-of-man': '马恩岛',
    'tz-name-istanbul': '伊斯坦布尔',
    'tz-name-jakarta': '雅加达',
    'tz-name-jamaica': '牙买加',
    'tz-name-jan-mayen': '扬马延',
    'tz-name-jayapura': '查亚普拉',
    'tz-name-jersey': '新泽西',
    'tz-name-jerusalem': '耶路撒冷',
    'tz-name-johannesburg': '约翰内斯堡',
    'tz-name-johnston': '约翰斯顿',
    'tz-name-juba': '朱巴',
    'tz-name-jujuy': '胡胡伊',
    'tz-name-juneau': '朱诺',
    'tz-name-kabul': '喀布尔',
    'tz-name-kaliningrad': '加里宁格勒',
    'tz-name-kamchatka': '堪察加',
    'tz-name-kampala': '坎帕拉',
    'tz-name-karachi': '卡拉奇',
    'tz-name-kashgar': '喀什',
    'tz-name-kathmandu': '加德满都',
    'tz-name-katmandu': '加德满都',
    'tz-name-kentucky': '肯塔基',
    'tz-name-kerguelen': '凯尔盖朗',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': '喀土穆',
    'tz-name-kiev': '基辅',
    'tz-name-kigali': '基加利',
    'tz-name-kinshasa': '金沙萨',
    'tz-name-kiritimati': '克里斯马斯',
    'tz-name-kirov': '基洛夫',
    'tz-name-knox': '诺克斯',
    'tz-name-knox-in': '印第安纳州诺克斯',
    'tz-name-kolkata': '加尔各答',
    'tz-name-kosrae': '科斯雷',
    'tz-name-kralendijk': '博内尔',
    'tz-name-krasnoyarsk': '克拉斯诺亚尔斯克',
    'tz-name-kuala-lumpur': '吉隆坡',
    'tz-name-kuching': '古晋',
    'tz-name-kuwait': '科威特',
    'tz-name-kwajalein': '夸贾林',
    'tz-name-la-paz': '拉巴斯',
    'tz-name-la-rioja': '拉里奥哈',
    'tz-name-lagos': '拉各斯',
    'tz-name-lhi': '豪勋爵岛',
    'tz-name-libreville': '利伯维尔',
    'tz-name-lima': '利马',
    'tz-name-lindeman': '林德曼',
    'tz-name-lisbon': '里斯本',
    'tz-name-ljubljana': '卢布尔雅那',
    'tz-name-lome': '洛美',
    'tz-name-london': '伦敦',
    'tz-name-longyearbyen': '朗伊尔城',
    'tz-name-lord-howe': '豪勋爵',
    'tz-name-los-angeles': '洛杉矶',
    'tz-name-louisville': '路易斯维尔',
    'tz-name-lower-princes': 'Lower Prince’s Quarter ',
    'tz-name-luanda': '罗安达',
    'tz-name-lubumbashi': '卢本巴希',
    'tz-name-lusaka': '卢萨卡',
    'tz-name-luxembourg': '卢森堡',
    'tz-name-macao': '澳门',
    'tz-name-macau': '澳门',
    'tz-name-maceio': '马塞约',
    'tz-name-macquarie': '麦格理',
    'tz-name-madeira': '马德拉',
    'tz-name-madrid': '马德里',
    'tz-name-magadan': '马加丹',
    'tz-name-mahe': '马埃',
    'tz-name-majuro': '马朱罗',
    'tz-name-makassar': '望加锡',
    'tz-name-malabo': '马拉博',
    'tz-name-maldives': '马尔代夫',
    'tz-name-malta': '马耳他',
    'tz-name-managua': '马那瓜',
    'tz-name-manaus': '马瑙斯',
    'tz-name-manila': '马尼拉',
    'tz-name-maputo': '马普托',
    'tz-name-marengo': '马伦戈',
    'tz-name-mariehamn': '马利汉姆',
    'tz-name-marigot': '马里戈特',
    'tz-name-marquesas': '马克萨斯',
    'tz-name-martinique': '马提尼克',
    'tz-name-maseru': '马塞卢',
    'tz-name-matamoros': '马塔莫罗斯',
    'tz-name-mauritius': '毛里求斯',
    'tz-name-mawson': '莫森',
    'tz-name-mayotte': '马约特',
    'tz-name-mazatlan': '马萨特兰',
    'tz-name-mbabane': '姆巴巴',
    'tz-name-mc-murdo': '麦克默多',
    'tz-name-melbourne': '墨尔本',
    'tz-name-mendoza': '门多萨',
    'tz-name-menominee': '梅诺米尼',
    'tz-name-merida': '梅里达',
    'tz-name-metlakatla': '梅特拉卡特拉',
    'tz-name-mexico': '墨西哥',
    'tz-name-mexico-city': '墨西哥城',
    'tz-name-michigan': '密歇根州',
    'tz-name-midway': '中途岛',
    'tz-name-minsk': '明斯克',
    'tz-name-miquelon': '密克隆',
    'tz-name-mogadishu': '摩加迪沙',
    'tz-name-monaco': '摩纳哥',
    'tz-name-moncton': '蒙克顿',
    'tz-name-monrovia': '蒙罗维亚',
    'tz-name-monterrey': '蒙特雷',
    'tz-name-montevideo': '蒙得维的亚',
    'tz-name-monticello': '蒙蒂塞洛',
    'tz-name-montreal': '蒙特利尔',
    'tz-name-montserrat': '蒙特塞拉特',
    'tz-name-moscow': '莫斯科',
    'tz-name-mountain': '山区',
    'tz-name-muscat': '马斯喀特',
    'tz-name-nairobi': '内罗毕',
    'tz-name-nassau': '拿骚',
    'tz-name-nauru': '瑙鲁',
    'tz-name-ndjamena': '恩贾梅纳',
    'tz-name-new-salem': '新塞勒姆',
    'tz-name-new-york': '纽约',
    'tz-name-newfoundland': '纽芬兰',
    'tz-name-niamey': '尼亚美',
    'tz-name-nicosia': '尼科西亚',
    'tz-name-nipigon': '尼皮贡',
    'tz-name-niue': '纽埃',
    'tz-name-nome': '诺姆',
    'tz-name-norfolk': '诺福克',
    'tz-name-noronha': '迪诺罗尼亚',
    'tz-name-north': '北部',
    'tz-name-north-dakota': '北达科他州',
    'tz-name-nouakchott': '努瓦克肖特',
    'tz-name-noumea': '努美阿',
    'tz-name-novokuznetsk': '新库兹涅茨克',
    'tz-name-novosibirsk': '新西伯利亚',
    'tz-name-nsw': '新南威尔士州',
    'tz-name-ojinaga': '奥希纳加',
    'tz-name-omsk': '鄂木斯克',
    'tz-name-oral': '乌拉尔',
    'tz-name-oslo': '奥斯陆',
    'tz-name-ouagadougou': '瓦加杜古',
    'tz-name-pacific': '太平洋',
    'tz-name-pacific-new': '太平洋新',
    'tz-name-pago-pago': '帕果帕果',
    'tz-name-palau': '帕劳',
    'tz-name-palmer': '帕尔默',
    'tz-name-panama': '巴拿马',
    'tz-name-pangnirtung': '庞纳唐',
    'tz-name-paramaribo': '帕拉马里博',
    'tz-name-paris': '巴黎',
    'tz-name-perth': '珀斯',
    'tz-name-petersburg': '圣彼得堡',
    'tz-name-phnom-penh': '金边',
    'tz-name-phoenix': '凤凰',
    'tz-name-pitcairn': '皮特凯恩',
    'tz-name-podgorica': '波德戈里察',
    'tz-name-pohnpei': '波纳佩',
    'tz-name-ponape': '波纳佩',
    'tz-name-pontianak': '坤甸',
    'tz-name-port-au-prince': '太子港',
    'tz-name-port-moresby': '莫尔兹比港',
    'tz-name-port-of-spain': '西班牙港',
    'tz-name-porto-acre': '波尔图阿克',
    'tz-name-porto-novo': '波多诺伏',
    'tz-name-porto-velho': '波多韦柳',
    'tz-name-prague': '布拉格',
    'tz-name-puerto-rico': '波多黎各',
    'tz-name-punta-arenas': '蓬塔阿雷纳斯',
    'tz-name-pyongyang': '平壤',
    'tz-name-qatar': '卡塔尔',
    'tz-name-qostanay': '科斯塔奈',
    'tz-name-queensland': '昆士兰',
    'tz-name-qyzylorda': '克孜勒奥尔达',
    'tz-name-rainy-river': '雷尼',
    'tz-name-rangoon': '仰光',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': '拉罗汤加岛',
    'tz-name-recife': '累西腓',
    'tz-name-regina': '里贾纳',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': '留尼汪',
    'tz-name-reykjavik': '雷克雅未克',
    'tz-name-riga': '里加',
    'tz-name-rio-branco': '里约布兰科',
    'tz-name-rio-gallegos': '里奥加耶戈斯',
    'tz-name-riyadh': '利雅得',
    'tz-name-rome': '罗马',
    'tz-name-rosario': '罗萨里奥',
    'tz-name-rothera': '罗瑟拉',
    'tz-name-saigon': '西贡',
    'tz-name-saipan': '塞班',
    'tz-name-sakhalin': '萨哈林',
    'tz-name-salta': '萨尔塔',
    'tz-name-samara': '萨马拉',
    'tz-name-samarkand': '撒马尔罕',
    'tz-name-samoa': '萨摩亚',
    'tz-name-san-juan': '圣胡安',
    'tz-name-san-luis': '圣路易斯',
    'tz-name-san-marino': '圣马力诺',
    'tz-name-santa-isabel': '圣伊莎贝尔',
    'tz-name-santarem': '圣塔伦',
    'tz-name-santiago': '圣地亚哥',
    'tz-name-santo-domingo': '圣多明各',
    'tz-name-sao-paulo': '圣保罗',
    'tz-name-sao-tome': '圣多美',
    'tz-name-sarajevo': '萨拉热窝',
    'tz-name-saratov': '萨拉托夫',
    'tz-name-saskatchewan': '萨斯喀彻温省',
    'tz-name-scoresbysund': '史科斯',
    'tz-name-seoul': '汉城',
    'tz-name-shanghai': '上海',
    'tz-name-shiprock': '希普罗克',
    'tz-name-simferopol': '辛菲罗波尔',
    'tz-name-singapore': '新加坡',
    'tz-name-sitka': '锡特卡',
    'tz-name-skopje': '斯科普里',
    'tz-name-sofia': '苏菲亚',
    'tz-name-south': '南部',
    'tz-name-south-georgia': '南乔治亚州',
    'tz-name-south-pole': '南极',
    'tz-name-srednekolymsk': '中科雷姆斯克',
    'tz-name-st-barthelemy': '圣巴泰勒米',
    'tz-name-st-helena': '圣赫勒拿岛',
    'tz-name-st-johns': '圣约翰斯',
    'tz-name-st-kitts': '圣基茨',
    'tz-name-st-lucia': '圣露西亚',
    'tz-name-st-thomas': '圣托马斯',
    'tz-name-st-vincent': '圣文森特',
    'tz-name-stanley': '斯坦利',
    'tz-name-stockholm': '斯德哥尔摩',
    'tz-name-swift-current': '斯威夫特卡伦特',
    'tz-name-sydney': '悉尼',
    'tz-name-syowa': '昭和',
    'tz-name-tahiti': '大溪地',
    'tz-name-taipei': '台北',
    'tz-name-tallinn': '塔林',
    'tz-name-tarawa': '塔拉瓦',
    'tz-name-tashkent': '塔什干',
    'tz-name-tasmania': '塔斯马尼亚',
    'tz-name-tbilisi': '第比利斯',
    'tz-name-tegucigalpa': '特古西加尔巴',
    'tz-name-tehran': '德黑兰',
    'tz-name-tel-aviv': '特拉维夫',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': '廷布',
    'tz-name-thimphu': '廷布',
    'tz-name-thule': '图勒',
    'tz-name-thunder-bay': '桑德湾',
    'tz-name-tijuana': '蒂华纳',
    'tz-name-timbuktu': '廷巴克图',
    'tz-name-tirane': '地拉那',
    'tz-name-tiraspol': '蒂拉斯波尔',
    'tz-name-tokyo': '东京',
    'tz-name-tomsk': '托木斯克',
    'tz-name-tongatapu': '汤加塔布',
    'tz-name-toronto': '多伦多',
    'tz-name-tortola': '托尔托拉',
    'tz-name-tripoli': '的黎波里',
    'tz-name-troll': 'Troll',
    'tz-name-truk': '特鲁克',
    'tz-name-tucuman': '图库曼',
    'tz-name-tunis': '突尼斯',
    'tz-name-ujung-pandang': '望加锡',
    'tz-name-ulaanbaatar': '乌兰巴托',
    'tz-name-ulan-bator': '乌兰巴托',
    'tz-name-ulyanovsk': '乌里扬诺夫斯克',
    'tz-name-urumqi': '乌鲁木齐',
    'tz-name-us': '美国',
    'tz-name-ushuaia': '乌斯怀亚',
    'tz-name-ust-nera': '乌斯季挪拉',
    'tz-name-uzhgorod': '乌日哥罗德',
    'tz-name-vaduz': '瓦杜兹',
    'tz-name-vancouver': '温哥华',
    'tz-name-vatican': '教廷',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': '维多利亚',
    'tz-name-vienna': '维也纳',
    'tz-name-vientiane': '万象',
    'tz-name-vilnius': '维尔纽斯',
    'tz-name-vincennes': '文森斯',
    'tz-name-virgin': '维尔京群岛',
    'tz-name-vladivostok': '符拉迪沃斯托克',
    'tz-name-volgograd': '伏尔加格勒',
    'tz-name-vostok': '沃斯托克',
    'tz-name-wake': '威克岛',
    'tz-name-wallis': '沃利斯',
    'tz-name-warsaw': '华沙',
    'tz-name-west': '西部',
    'tz-name-whitehorse': '白马',
    'tz-name-winamac': '威纳马克',
    'tz-name-windhoek': '温得和克',
    'tz-name-winnipeg': '温尼伯',
    'tz-name-yakutat': '亚库塔特',
    'tz-name-yakutsk': '雅库茨克',
    'tz-name-yancowinna': '扬科维纳',
    'tz-name-yangon': '仰光',
    'tz-name-yap': '雅浦',
    'tz-name-yekaterinburg': '叶卡捷琳堡',
    'tz-name-yellowknife': '耶洛奈夫',
    'tz-name-yerevan': '埃里温',
    'tz-name-yukon': '育空',
    'tz-name-zagreb': '萨格勒布',
    'tz-name-zaporozhye': '扎波罗热',
    'tz-name-zurich': '苏黎世',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinalS(count, '一个文件');
        return `上传${files}，剩下${size}`;
    },

    'user-list-add': '添加用户',
    'user-list-approve-all': '批准所有请求',
    'user-list-cancel': '取消',
    'user-list-column-email': '电子邮件地址',
    'user-list-column-last-modified': '上次修改时间',
    'user-list-column-name': '名称',
    'user-list-column-projects': '项目',
    'user-list-column-roles': '角色',
    'user-list-column-type': '类型',
    'user-list-column-username': '用户名',
    'user-list-confirm-disable-$count': (count) => {
        let users = cardinalS(count, '这个用户', '这三个用户');
        return `你确定要关闭${users}？`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let users = cardinalS(count, '这个用户', '这三个用户');
        return `你确定要恢复${users}？`;
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
        let text = '用户';
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
        let text = '成员';
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
    'user-summary-remove-membership': '将用户从项目删除',
    'user-summary-restore-membership': '将用户添加到项目',
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

    'user-tooltip-$count': (count) => {
        return cardinalS(count, '一个用户');
    },

    'validation-duplicate-project-name': '具有该标识符的项目已经存在',
    'validation-duplicate-role-name': '具有该标识符的角色已经存在',
    'validation-duplicate-server-name': '具有该标识符的服务器已经存在',
    'validation-duplicate-source-name': '具有该标识的数据源已经存在',
    'validation-duplicate-spreadsheet-name': '具有该标识的链接已经存在',
    'validation-duplicate-user-name': '具有该用户名的用户已经存在',
    'validation-illegal-project-name': '项目标识符不能是《global》，《admin》，《public》，或《srv》',
    'validation-invalid-timezone': '不正确的时区',
    'validation-localhost-is-wrong': '《localhost》是不正确的',
    'validation-password-for-admin-only': '只有管理员可以使用密码登录',
    'validation-required': '需要',
    'validation-used-by-trambar': '由电车吧使用',

    'website-summary-cancel': '取消',
    'website-summary-domain-names': '网站域名',
    'website-summary-edit': '编辑网站',
    'website-summary-save': '保存网站',
    'website-summary-template': '网站模板',
    'website-summary-template-disabled': '不使用网站',
    'website-summary-template-generic': '通用模板',
    'website-summary-timezone': '时区',
    'website-summary-title': '网站',
    'website-summary-traffic-report-time': '交通报告发布时间',
    'website-summary-versions': '版本',

    'welcome': '欢迎!',

    'wiki-list-cancel': '取消',
    'wiki-list-column-last-modified': '上次修改时间',
    'wiki-list-column-public': '公开',
    'wiki-list-column-repo': '数据库',
    'wiki-list-column-title': '标题',
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, '此页面', '这三页');
        return `你确定要取消选择${pages}吗？`;
    },
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, '此页面', '这三页');
        return `你确定要将${pages}公开吗？`;
    },
    'wiki-list-edit': '编辑页面列表',
    'wiki-list-public-always': '总是',
    'wiki-list-public-no': '不是',
    'wiki-list-public-referenced': '链接',
    'wiki-list-save': '保存页面列表',
    'wiki-list-title': 'GitLab维基',

    'wiki-summary-$title': (title) => {
        let text = 'GitLab维基';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': '取消',
    'wiki-summary-confirm-deselect': '你確定要取消選擇此頁面嗎？',
    'wiki-summary-confirm-select': '你确定要将此页面公开吗？',
    'wiki-summary-deselect': '取消选择页面',
    'wiki-summary-edit': '编辑页面',
    'wiki-summary-hidden': '搜索',
    'wiki-summary-hidden-false': '出现在搜索结果中',
    'wiki-summary-hidden-true': '不会在搜索结果中出现',
    'wiki-summary-page-contents': '内容',
    'wiki-summary-public': '公开',
    'wiki-summary-public-always': '总是',
    'wiki-summary-public-no': '不是',
    'wiki-summary-public-referenced': '是（由另一个公共页面链接）',
    'wiki-summary-repo': '存储库标识符',
    'wiki-summary-return': '返回页面列表',
    'wiki-summary-save': '保存页面',
    'wiki-summary-select': '选择页面',
    'wiki-summary-slug': 'Slug',
    'wiki-summary-title': '标题',
};

export {
    chooseVariant as phrases,
};
