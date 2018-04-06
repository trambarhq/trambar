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
        if (cantonese) {
            var merged = {};
            for (var name in traditionalPhrases) {
                merged[name] = cantonesePhrases[name] || traditionalPhrases[name];
            }
            return merged
        } else {
            return traditionalPhrases;
        }
    } else {
        return simplifiedPhrases;
    }
};

var traditionalPhrases = {
    'action-contact-by-email': '用電子郵件聯繫',
    'action-contact-by-ichat': '用iChat聯繫',
    'action-contact-by-phone': '用電話聯繫',
    'action-contact-by-skype': '用Skype聯繫',
    'action-contact-by-slack': '用Slack聯繫',
    'action-contact-by-twitter': '用Twitter聯繫',
    'action-view-github-page': '查看GitHub個人頁面',
    'action-view-gitlab-page': '查看GitLab個人頁面',
    'action-view-linkedin-page': '查看LinkedIn個人頁面',
    'action-view-stackoverflow-page': '查看StackOverflow個人頁面',

    'activation-address': '服務器地址',
    'activation-cancel': '取消',
    'activation-code': '授權碼',
    'activation-ok': '完成',
    'activation-schema': '項目',

    'alert-$count-new-bookmarks': (count) => {
        var num = cardinalT(count);
        return `${num}張新書籤`;
    },
    'alert-$count-new-notifications': (count) => {
        var num = cardinalT(count);
        return `${num}個新通知`;
    },
    'alert-$count-new-stories': (count) => {
        var num = cardinalT(count);
        return `${num}個新故事`;
    },

    'app-name': '電車吧',

    'audio-capture-accept': '接受',
    'audio-capture-cancel': '取消',
    'audio-capture-pause': '暫停',
    'audio-capture-rerecord': '重新錄製',
    'audio-capture-resume': '繼續',
    'audio-capture-start': '開始',
    'audio-capture-stop': '停止',

    'bookmark-$count-other-users': (count) => {
        var num = cardinalT(count);
        return `另外${num}個人`;
    },
    'bookmark-$count-users': (count) => {
        var num = cardinalT(count);
        return `${num}個人`;
    },
    'bookmark-$name-and-$others-recommend-this': (name, others) => {
        return [ `${name}和`, others, `推薦這個` ];
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name}推薦這個`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name) => {
        return [ name1, '和', name2, '推薦這個' ];
    },
    'bookmark-$you-bookmarked-it': '你加了這個書籤',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `你加了這個書籤（${name}推薦）`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others) => {
        return [ `你加了這個書籤（`, others, `推薦）` ];
    },
    'bookmark-recommendations': '推薦',

    'bookmarks-no-bookmarks': '沒有書籤',

    'bottom-nav-bookmarks': '書籤',
    'bottom-nav-news': '信息',
    'bottom-nav-notifications': '通知',
    'bottom-nav-people': '人員',
    'bottom-nav-settings': '設置',

    'confirmation-cancel': '取消',
    'confirmation-confirm': '肯定',

    'device-selector-camera-$number': (number) => {
        return `攝影機${number}`;
    },
    'device-selector-camera-back': '後置',
    'device-selector-camera-front': '前置',
    'device-selector-mic-$number': (number) => {
        return `麥克風${number}`;
    },

    'diagnostics-show': '顯示診斷',
    'diagnostics-show-panel': '顯示此面板',

    'empty-currently-offline': '你目前離線',

    'image-editor-page-rendering-in-progress': '正在制作網站預覽⋯⋯',
    'image-editor-poster-extraction-in-progress': '正在從影片中提取預覽⋯⋯',
    'image-editor-upload-in-progress': '正在上傳⋯⋯',

    'issue-cancel': '取消',
    'issue-clear': '清除',
    'issue-ok': '完成',
    'issue-repo': '數據庫',
    'issue-title': '標題',

    'list-$count-more': (count) => {
        var num = cardinalT(count);
        return `重有${num}個⋯⋯`;
    },

    'media-close': '關閉',
    'media-download-original': '下載原本文件',
    'media-editor-embed': '嵌入',
    'media-editor-remove': '刪除',
    'media-editor-shift': '推前',
    'media-next': '下一個',
    'media-previous': '上一個',

    'membership-request-$you-are-member': '你是這個項目的成員',
    'membership-request-$you-are-now-member': '你成為了這個項目的成員',
    'membership-request-$you-have-requested-membership': '你要求成為這個項目的成員',
    'membership-request-browse': '瀏覽',
    'membership-request-cancel': '取消',
    'membership-request-join': '加入',
    'membership-request-ok': '完成',
    'membership-request-proceed': '繼續',
    'membership-request-withdraw': '退出',

    'mobile-device-revoke': '吊銷',
    'mobile-device-revoke-are-you-sure': '你確定要吊銷此裝置的授權嗎？',

    'mobile-setup-address': '服務器地址',
    'mobile-setup-close': '關閉',
    'mobile-setup-code': '授權碼',

    'news-no-stories-by-role': '沒有這個角色的人的故事',
    'news-no-stories-found': '沒有找到匹配的故事',
    'news-no-stories-on-date': '那天沒有故事',
    'news-no-stories-yet': '沒有故事',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name}邀請你共同編輯一個貼文`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = '推送'; break;
            case 'merge': story = '合併'; break;
            case 'branch': story = '分支'; break;
            case 'survey': story = '調查'; break;
            case 'task-list': story = '任務列表'; break;
            case 'post': story = '貼文'; break;
            default: story = '故事';
        }
        return `${name}回應了你的${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name}完成了在你的列表上一個任務`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '調查'; break;
            case 'task-list': story = '任務列表'; break;
            case 'post': story = '貼文'; break;
            default: story = '故事';
        }
        return `${name}喜歡你的${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = '一個回應中';
        return `${name}在${reaction}提到你`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '一個調查上'; break;
            case 'task-list': story = '一個任務列表上'; break;
            case 'post': story = '一個貼文中'; break;
            case 'issue': story = '一個問題上'; break;
            case 'merge-request': story = '一個合併請求中'; break;
            default: story = '一個故事中';
        }
        return `${name}在${story}提到你`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name}開了一個問題`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name}發布了一個調查`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name}要求加入這個項目`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '調查'; break;
            case 'task-list': story = '任務列表'; break;
            case 'post': story = '貼文'; break;
            default: story = '故事';
        }
        return `${name}送你一個${story}書籤`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name}回答了你的調查`;
    },
    'notification-option-assignment': '當你被分配到一個問題',
    'notification-option-bookmark': '當你收到某人的書籤',
    'notification-option-coauthor': '當你收到共同編輯貼文的邀請',
    'notification-option-comment': '當有人回應你的貼文',
    'notification-option-issue': '當有人打開了一個問題',
    'notification-option-join-request': '當有人想加入這個項目',
    'notification-option-like': '當有人喜歡你的貼文',
    'notification-option-mention': '當有人在故事或回應中提到你時',
    'notification-option-merge': '當有人將代碼合併到《master》分支',
    'notification-option-note': '當有人在提交或問題上發布註釋',
    'notification-option-push': '當有人推入代碼到git數據庫',
    'notification-option-survey': '當有人發布調查',
    'notification-option-task-completion': '當有人完成你列表上的任務',
    'notification-option-vote': '當有人回答你的調查',
    'notification-option-web-session': '當你用網絡瀏覽器查看這個網站時',

    'notifications-no-notifications-on-date': '那天沒有通知',
    'notifications-no-notifications-yet': '還沒有通知',

    'option-add-bookmark': '加書籤',
    'option-add-issue': '加問題入跟蹤管理系統',
    'option-bump-story': '推動故事',
    'option-edit-comment': '編輯回應',
    'option-edit-post': '編輯貼文',
    'option-hide-comment': '非成員看不到',
    'option-hide-story': '非成員看不到',
    'option-keep-bookmark': '保留書籤',
    'option-remove-comment': '刪除回應',
    'option-remove-story': '刪除故事',
    'option-send-bookmarks': '發送書籤給其他人',
    'option-send-bookmarks-to-$count-users': (count) => {
        var num = cardinalT(count);
        return `發送書籤給${num}個人`;
    },
    'option-show-media-preview': '顯示附件媒體',
    'option-show-text-preview': '顯示課文預覽',
    'option-statistics-biweekly': '顯示過去十四天的活動',
    'option-statistics-monthly': '顯示月度活動',
    'option-statistics-to-date': '顯示迄今的活動',

    'people-no-stories-found': '沒有找到匹配的故事',
    'people-no-stories-on-date': '那天沒有活動',
    'people-no-users-by-role': '沒有項目成員有這個角色',
    'people-no-users-yet': '沒有項目成員',

    'person-no-stories-found': '沒有找到匹配的故事',
    'person-no-stories-on-date': '那天沒有故事',
    'person-no-stories-yet': '還沒有故事',

    'photo-capture-accept': '接受',
    'photo-capture-cancel': '取消',
    'photo-capture-retake': '重拍',
    'photo-capture-snap': '拍照',

    'project-description-close': '關閉',

    'project-management-add': '添加',
    'project-management-cancel': '取消',
    'project-management-description': '項目介紹',
    'project-management-manage': '管理列表',
    'project-management-mobile-set-up': '手機設置',
    'project-management-remove': '刪除',
    'project-management-sign-out': '註銷',
    'project-management-sign-out-are-you-sure': '你確定你想從該服務器註銷？',

    'qr-scanner-cancel': '取消',
    'qr-scanner-invalid-qr-code': '不正確的ＱＲ碼',
    'qr-scanner-qr-code-found': '找到ＱＲ碼',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name}把這個貼文放到問題跟踪器上`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name}投了一票`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name}回應了這個分支`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name}回應了這個問題`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name}回應了這個合併`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name}回應了這個合併請求`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name}回應了這個推送`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name}完成了一個任務`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name}被分配到這個問題`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name}被分配到這個合併請求`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name}正在編輯一個回應⋯⋯`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name}正在發表一個回應⋯⋯`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name}正在寫一個回應⋯⋯`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name}喜歡這個`;
    },
    'reaction-status-storage-pending': '等待連接',
    'reaction-status-transcoding': '轉碼',
    'reaction-status-uploading': '上傳',

    'role-filter-no-roles': '沒有角色',

    'search-bar-keywords': '關鍵字或井號標籤',

    'selection-cancel': '取消',
    'selection-ok': '接受',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-device': '行動裝置',
    'settings-devices': '行動裝置',
    'settings-diagnostics': '診斷',
    'settings-language': '語言',
    'settings-mobile-alert': '行動裝置警報',
    'settings-notification': '通知',
    'settings-profile-image': '檔案圖像',
    'settings-projects': '項目',
    'settings-social-networks': '社交網絡',
    'settings-user-information': '用戶資料',
    'settings-web-alert': '瀏覽器警報',

    'social-network-github': 'GitHub個人資料網址',
    'social-network-gitlab': 'GitLab個人資料網址',
    'social-network-ichat': 'iChat用戶名',
    'social-network-linkedin': 'LinkedIn個人資料網址',
    'social-network-skype': 'Skype用戶名',
    'social-network-slack': 'Slack用戶ID',
    'social-network-slack-team': 'Slack團體ID',
    'social-network-stackoverflow': 'StackOverflow個人資料網址',
    'social-network-twitter': 'Twitter用戶名',

    'start-activation-add-server': '從另一台服務器添加項目',
    'start-activation-instructions': (ui) => {
        return [
            '請先使用網絡瀏覽器登錄電車吧服務器。選擇一個項目，然後進入',
            ui.settings,
            '。在',
            ui.projects,
            '面板中單擊',
            ui.mobileSetup,
            '。 ＱＲ碼將出現在屏幕上。在此裝置按下面的按鈕，然後掃描ＱＲ碼。如果相機出現故障，你可以用鍵盤輸入授權碼。'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Sign in using a web browser then scan the QR code shown in ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': '鍵盤輸入',
    'start-activation-scan-code': '掃描ＱＲ碼',
    'start-error-access-denied': '請求被拒絕',
    'start-error-account-disabled': '帳戶目前被禁用',
    'start-error-existing-users-only': '只有授權人員才能訪問此系統',
    'start-error-undefined': '意外的錯誤',
    'start-no-projects': '沒有項目',
    'start-no-servers': '沒有OAuth提供者',
    'start-projects': '項目',
    'start-social-login': '社交登錄',
    'start-system-title-default': '電車吧',
    'start-welcome': '歡迎!',
    'start-welcome-again': '再次歡迎',

    'statistics-bar': '條圖',
    'statistics-line': '線圖',
    'statistics-pie': '餅圖',

    'story-$count-reactions': (count) => {
        var num = cardinalT(count);
        return `${num}個反應`;
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `在《${repo}》數據庫中創建了《${branch}》分支`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `建立了《${milestone}》里程碑`;
    },
    'story-$name-created-$page': (name, page) => {
        return `建立了wiki頁面《${page}》”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        var text = `建立了`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `數據庫`;
        return text;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `刪除了wiki頁面《${page}》”`;
    },
    'story-$name-joined-$repo': (name, repo) => {
        var text = `加入了`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `數據庫`;
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        var text = `離開了`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `數據庫`;
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        var text = `將`;
        if (branches && branches.length > 0) {
            var sources = branches.map((branch) => {
                return `《${branch}》`;
            });
            text += `${sources.join('、')}分支的代碼合併到`;
        }
        if (repo) {
            text += `《${repo}》數據庫的`;
        }
        text += `《${branch}》分支`;
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        var text = `開了問題${number}`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        var text = `推了一些代碼修改入到`
        if (repo) {
            text += `《${repo}》數據庫的`;
        }
        text += `《${branch}》分支`;
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `要求將《${branch1}》分支合併到《${branch2}》分支`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `修正了wiki頁面《${page}》`;
    },
    'story-add-coauthor': '加合著者',
    'story-add-remove-coauthor': '替代合著者',
    'story-audio': '音頻',
    'story-author-$count-others': (count) => {
        var num = cardinalT(count);
        return `另外${num}個人`;
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, '和', name2 ];
    },
    'story-cancel': '取消',
    'story-cancel-are-you-sure': '你確定要取消這個貼文？',
    'story-cancel-edit-are-you-sure': '你確定要取消這些更正？',
    'story-coauthors': '合著者',
    'story-comment': '留言',
    'story-drop-files-here': '在此處拖放媒體文件',
    'story-file': '文件',
    'story-issue-current-status': '當前狀態：',
    'story-issue-status-closed': '關閉',
    'story-issue-status-opened': '開設',
    'story-issue-status-reopened': '重開',
    'story-like': '喜歡',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': '截止日期：',
    'story-milestone-start-date': '開始日期：',
    'story-options': '選項',
    'story-paste-image-here': '粘貼到文本編輯器中的圖像會在這裡出現',
    'story-pending': '听候⋯⋯',
    'story-photo': '照片',
    'story-post': '發送',
    'story-push-added-$count-files': (count) => {
        return `加了${count}個文件`;
    },
    'story-push-added-$count-lines': (count) => {
        return `加了${count}行代碼`;
    },
    'story-push-components-changed': '更改了以下部分：',
    'story-push-deleted-$count-files': (count) => {
        return `刪除了${count}個文件`;
    },
    'story-push-deleted-$count-lines': (count) => {
        return `刪除了${count}行代碼`;
    },
    'story-push-modified-$count-files': (count) => {
        return `修改了${count}個文件`;
    },
    'story-push-renamed-$count-files': (count) => {
        return `改了${count}個文件的名`;
    },
    'story-remove-yourself': '放棄作者權力',
    'story-remove-yourself-are-you-sure': '你確定你不要做這個貼文的合著者？',
    'story-status-storage-pending': '等待連接',
    'story-status-transcoding-$progress': (progress) => {
        return `轉碼（${progress}%）`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `上傳（${progress}%）`;
    },
    'story-survey': '調查',
    'story-task-list': '任務列表',
    'story-video': '影片',
    'story-vote-submit': '遞交',

    'telephone-dialog-close': '關閉',

    'time-$hours-ago': (hours) => {
        var num = cardinal(hours);
        return `${num}小時前`;
    },
    'time-$hr-ago': (hr) => {
        var num = cardinal(hr);
        return `${num}小時前`;
    },
    'time-$min-ago': (min) => {
        var num = cardinal(min);
        return `${num}分鐘前`;
    },
    'time-$minutes-ago': (minutes) => {
        var num = cardinal(minutes);
        return `${num}分鐘前`;
    },
    'time-just-now': '剛才',
    'time-yesterday': '昨天',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        return `上傳${num}個文件，剩下${size}`;
    },

    'user-actions': '行動',

    'user-activity-$name-created-branch': '建立了一個分支',
    'user-activity-$name-created-merge-request': '發出一個合併請求',
    'user-activity-$name-created-milestone': '建立了一個里程碑',
    'user-activity-$name-created-repo': '建立了一個git數據庫',
    'user-activity-$name-edited-wiki-page': '編輯了一個wiki頁面',
    'user-activity-$name-joined-repo': '加入了數據庫',
    'user-activity-$name-left-repo': '離開了數據庫',
    'user-activity-$name-merged-code': '合併了代碼',
    'user-activity-$name-opened-issue': '開了一個問題',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        var num = cardinalT(count);
        return `新增了${num}個音頻剪輯`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        var num = cardinalT(count);
        return `新增了${num}個網頁鏈接`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        var num = cardinalT(count);
        return `新增了${num}張相片`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        var num = cardinalT(count);
        return `新增了${num}張影片`;
    },
    'user-activity-$name-pushed-code': '將代碼推送到數據庫',
    'user-activity-$name-reported-issue': '報告了一個問題',
    'user-activity-$name-started-survey': '發布了一個調查',
    'user-activity-$name-started-task-list': '發布了一個任務列表',
    'user-activity-$name-was-assigned-issue': '被分配到一個問題',
    'user-activity-$name-wrote-post': '寫了一個貼文',
    'user-activity-back': '返回',
    'user-activity-more': '更多',

    'user-image-remove': '刪除',
    'user-image-select': '選擇',
    'user-image-snap': '拍照',

    'user-info-email': '電子郵件地址',
    'user-info-gender': '性別',
    'user-info-gender-female': '女性',
    'user-info-gender-male': '男性',
    'user-info-gender-unspecified': '未指定',
    'user-info-name': '名稱',
    'user-info-phone': '電話號碼',

    'user-statistics-legend-branch': '分支',
    'user-statistics-legend-issue': '問題',
    'user-statistics-legend-member': '成員變更',
    'user-statistics-legend-merge': '代碼合併',
    'user-statistics-legend-merge-request': '合併請求',
    'user-statistics-legend-milestone': '里程碑',
    'user-statistics-legend-post': '貼文',
    'user-statistics-legend-push': '推送',
    'user-statistics-legend-repo': '數據庫修改',
    'user-statistics-legend-survey': '調查',
    'user-statistics-legend-task-list': '任務列表',
    'user-statistics-legend-wiki': 'wiki修改',
    'user-statistics-today': '今天',
    'user-statistics-tooltip-$count-branch': (count) => {
        return `${count}個分支`;
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return `${count}個問題`
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return `${count}個成員變更`;
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return `${count}個代碼合併`;
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return `${count}個合併請求`;
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return `${count}個里程碑`
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return `${count}個貼文`;
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return `${count}個代碼推送`;
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return `${count}個數據庫變更`;
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return `${count}個調查`;
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return `${count}個任務列表`;
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return `${count}個wiki修改`;
    },

    'video-capture-accept': '接受',
    'video-capture-cancel': '取消',
    'video-capture-pause': '暫停',
    'video-capture-resume': '繼續',
    'video-capture-retake': '重新錄製',
    'video-capture-start': '開始',
    'video-capture-stop': '停止',
};

var simplifiedPhrases = {
    'action-contact-by-email': '用电子邮件联系',
    'action-contact-by-ichat': '用iChat联系',
    'action-contact-by-phone': '用电话联系',
    'action-contact-by-skype': '用Skype联系',
    'action-contact-by-slack': '用Slack联系',
    'action-contact-by-twitter': '用Twitter联系',
    'action-view-github-page': '查看GitHub个人页面',
    'action-view-gitlab-page': '查看GitLab个人页面',
    'action-view-linkedin-page': '查看LinkedIn个人页面',
    'action-view-stackoverflow-page': '查看StackOverflow个人页面',

    'activation-address': '服务器地址',
    'activation-cancel': '取消',
    'activation-code': '授权码',
    'activation-ok': '完成',
    'activation-schema': '项目',

    'alert-$count-new-bookmarks': (count) => {
        var num = cardinalS(count);
        return `${num}张新书签`;
    },
    'alert-$count-new-notifications': (count) => {
        var num = cardinalS(count);
        return `${num}个新通知`;
    },
    'alert-$count-new-stories': (count) => {
        var num = cardinalS(count);
        return `${num}个新故事`;
    },

    'app-name': '电车吧',

    'audio-capture-accept': '接受',
    'audio-capture-cancel': '取消',
    'audio-capture-pause': '暂停',
    'audio-capture-rerecord': '重新录制',
    'audio-capture-resume': '继续',
    'audio-capture-start': '开始',
    'audio-capture-stop': '停止',

    'bookmark-$count-other-users': (count) => {
        var num = cardinalS(count);
        return `另外${num}个人`;
    },
    'bookmark-$count-users': (count) => {
        var num = cardinalS(count);
        return `${num}个人`;
    },
    'bookmark-$name-and-$others-recommend-this': (name, others) => {
        return [ `${name}和`, others, `推荐这个` ];
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name}推荐这个`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name) => {
        return [ name1, '和', name2, '推荐这个' ];
    },
    'bookmark-$you-bookmarked-it': '你加了这个书签',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `你加了这个书签（${name}推荐）`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others) => {
        return [ `你加了这个书签（`, others, `推荐）` ];
    },
    'bookmark-recommendations': '推荐',

    'bookmarks-no-bookmarks': '没有书签',

    'bottom-nav-bookmarks': '书签',
    'bottom-nav-news': '信息',
    'bottom-nav-notifications': '通知',
    'bottom-nav-people': '人员',
    'bottom-nav-settings': '设置',

    'confirmation-cancel': '取消',
    'confirmation-confirm': '肯定',

    'device-selector-camera-$number': (number) => {
        return `摄影机${number}`;
    },
    'device-selector-camera-back': '后置',
    'device-selector-camera-front': '前置',
    'device-selector-mic-$number': (number) => {
        return `麦克风${number}`;
    },

    'diagnostics-show': '显示诊断',
    'diagnostics-show-panel': '显示此面板',

    'empty-currently-offline': '你目前离线',

    'image-editor-page-rendering-in-progress': '正在制作网站预览⋯⋯',
    'image-editor-poster-extraction-in-progress': '正在从影片中提取预览⋯⋯',
    'image-editor-upload-in-progress': '正在上传⋯⋯',

    'issue-cancel': '取消',
    'issue-clear': '清除',
    'issue-ok': '完成',
    'issue-repo': '数据库',
    'issue-title': '标题',

    'list-$count-more': (count) => {
        var num = cardinalS(count);
        return `重有${num}个⋯⋯`;
    },

    'media-close': '关闭',
    'media-download-original': '下载原本文件',
    'media-editor-embed': '嵌入',
    'media-editor-remove': '删除',
    'media-editor-shift': '推前',
    'media-next': '下一个',
    'media-previous': '上一个',

    'membership-request-$you-are-member': '你是这个项目的成员',
    'membership-request-$you-are-now-member': '你成为了这个项目的成员',
    'membership-request-$you-have-requested-membership': '你要求成为这个项目的成员',
    'membership-request-browse': '浏览',
    'membership-request-cancel': '取消',
    'membership-request-join': '加入',
    'membership-request-ok': '完成',
    'membership-request-proceed': '继续',
    'membership-request-withdraw': '退出',

    'mobile-device-revoke': '吊销',
    'mobile-device-revoke-are-you-sure': '你确定要吊销此装置的授权吗？',

    'mobile-setup-address': '服务器地址',
    'mobile-setup-close': '关闭',
    'mobile-setup-code': '授权码',

    'news-no-stories-by-role': '没有这个角色的人的故事',
    'news-no-stories-found': '没有找到匹配的故事',
    'news-no-stories-on-date': '那天没有故事',
    'news-no-stories-yet': '还没有故事',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name}邀请你共同编辑一个贴文`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = '推送'; break;
            case 'merge': story = '合并'; break;
            case 'branch': story = '分支'; break;
            case 'survey': story = '调查'; break;
            case 'task-list': story = '任务列表'; break;
            case 'post': story = '贴文'; break;
            default: story = '故事';
        }
        return `${name}回应了你的${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name}完成了在你的列表上一个任务`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '调查'; break;
            case 'task-list': story = '任务列表'; break;
            case 'post': story = '贴文'; break;
            default: story = '故事';
        }
        return `${name}喜欢你的${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = '一个回应中';
        return `${name}在${reaction}提到你`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '一个调查上'; break;
            case 'task-list': story = '一个任务列表上'; break;
            case 'post': story = '一个贴文中'; break;
            case 'issue': story = '一个问题上'; break;
            case 'merge-request': story = '一个合并请求中'; break;
            default: story = '一个故事中';
        }
        return `${name}在${story}提到你`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name}开了一个问题`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name}发布了一个调查`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name}要求加入这个项目`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '调查'; break;
            case 'task-list': story = '任务列表'; break;
            case 'post': story = '贴文'; break;
            default: story = '故事';
        }
        return `${name}送你一个${story}书签`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name}回答了你的调查`;
    },
    'notification-option-assignment': '当你被分配到一个问题',
    'notification-option-bookmark': '当你收到某人的书签',
    'notification-option-coauthor': '当你收到共同编辑贴文的邀请',
    'notification-option-comment': '当有人回应你的贴文',
    'notification-option-issue': '当有人打开了一个问题',
    'notification-option-join-request': '当有人想加入这个项目',
    'notification-option-like': '当有人喜欢你的贴文',
    'notification-option-mention': '当有人在故事或回应中提到你时',
    'notification-option-merge': '当有人将代码合并到《master》分支',
    'notification-option-note': '当有人在提交或问题上发布注释',
    'notification-option-push': '当有人推入代码到git数据库',
    'notification-option-survey': '当有人发布调查',
    'notification-option-task-completion': '当有人完成你列表上的任务',
    'notification-option-vote': '当有人回答你的调查',
    'notification-option-web-session': '当你用网络浏览器查看这个网站时',

    'notifications-no-notifications-on-date': '那天没有通知',
    'notifications-no-notifications-yet': '还没有通知',

    'option-add-bookmark': '加书签',
    'option-add-issue': '加问题入跟踪管理系统',
    'option-bump-story': '推动故事',
    'option-edit-comment': '编辑回应',
    'option-edit-post': '编辑贴文',
    'option-hide-comment': '非成员看不到',
    'option-hide-story': '非成员看不到',
    'option-keep-bookmark': '保留书签',
    'option-remove-comment': '删除回应',
    'option-remove-story': '删除故事',
    'option-send-bookmarks': '发送书签给其他人',
    'option-send-bookmarks-to-$count-users': (count) => {
        var num = cardinalS(count);
        return `发送书签给${num}个人`;
    },
    'option-show-media-preview': '显示附件媒体',
    'option-show-text-preview': '显示课文预览',
    'option-statistics-biweekly': '显示过去十四天的活动',
    'option-statistics-monthly': '显示月度活动',
    'option-statistics-to-date': '显示迄今的活动',

    'people-no-stories-found': '没有找到匹配的故事',
    'people-no-stories-on-date': '那天没有活动',
    'people-no-users-by-role': '没有项目成员有这个角色',
    'people-no-users-yet': '没有项目成员',

    'person-no-stories-found': '没有找到匹配的故事',
    'person-no-stories-on-date': '那天没有故事',
    'person-no-stories-yet': '还没有故事',

    'photo-capture-accept': '接受',
    'photo-capture-cancel': '取消',
    'photo-capture-retake': '重拍',
    'photo-capture-snap': '拍照',

    'project-description-close': '关闭',

    'project-management-add': '添加',
    'project-management-cancel': '取消',
    'project-management-description': '项目介绍',
    'project-management-manage': '管理列表',
    'project-management-mobile-set-up': '手机设置',
    'project-management-remove': '删除',
    'project-management-sign-out': '注销',
    'project-management-sign-out-are-you-sure': '你确定你想从该服务器注销？',

    'qr-scanner-cancel': '取消',
    'qr-scanner-invalid-qr-code': '不正确的ＱＲ码',
    'qr-scanner-qr-code-found': '找到QR码',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name}把这个贴文放到问题跟踪器上`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name}投了一票`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name}回应了这个分支`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name}回应了这个问题`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name}回应了这个合并`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name}回应了这个合并请求`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name}回应了这个推送`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name}完成了一个任务`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name}被分配到这个问题`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name}被分配到这个合并请求`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name}正在编辑一个回应⋯⋯`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name}正在发表一个回应⋯⋯`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name}正在写一个回应⋯⋯`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name}喜欢这个`;
    },
    'reaction-status-storage-pending': '等待连接',
    'reaction-status-transcoding': '转码',
    'reaction-status-uploading': '上传',

    'role-filter-no-roles': '没有角色',

    'search-bar-keywords': '关键字或井号标签',

    'selection-cancel': '取消',
    'selection-ok': '接受',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-device': '行动装置',
    'settings-devices': '行动装置',
    'settings-diagnostics': '诊断',
    'settings-language': '语言',
    'settings-mobile-alert': '行动装置警报',
    'settings-notification': '通知',
    'settings-profile-image': '档案图像',
    'settings-projects': '项目',
    'settings-social-networks': '社交网络',
    'settings-user-information': '用户资料',
    'settings-web-alert': '浏览器警报',

    'social-network-github': 'GitHub个人资料网址',
    'social-network-gitlab': 'GitLab个人资料网址',
    'social-network-ichat': 'iChat用户名',
    'social-network-linkedin': 'LinkedIn个人资料网址',
    'social-network-skype': 'Skype用户名',
    'social-network-slack': 'Slack用户ID',
    'social-network-slack-team': 'Slack团体ID',
    'social-network-stackoverflow': 'StackOverflow个人资料网址',
    'social-network-twitter': 'Twitter用户名',

    'start-activation-add-server': '从另一台服务器添加项目',
    'start-activation-instructions': (ui) => {
        return [
            '请先使用网络浏览器登录電車吧服务器。选择一个项目，然后进入',
            ui.settings,
            '。在',
            ui.projects,
            '面板中单击',
            ui.mobileSetup,
            '。 ＱＲ码将出现在屏幕上。在此装置按下面的按，钮然后扫描ＱＲ码。如果相机出现故障，你可以用键盘输入授权码。'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Sign in using a web browser then scan the QR code shown in ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': '键盘输入',
    'start-activation-scan-code': '扫描ＱＲ码',
    'start-error-access-denied': '请求被拒绝',
    'start-error-account-disabled': '帐户目前被禁用',
    'start-error-existing-users-only': '只有授权人员才能访问此系统',
    'start-error-undefined': '意外的错误',
    'start-no-projects': '没有项目',
    'start-no-servers': '没有OAuth提供者',
    'start-projects': '项目',
    'start-social-login': '社交登录',
    'start-system-title-default': '电车吧',
    'start-welcome': '欢迎!',
    'start-welcome-again': '再次欢迎',

    'statistics-bar': '条图',
    'statistics-line': '线图',
    'statistics-pie': '饼图',

    'story-$count-reactions': (count) => {
        var num = cardinalS(count);
        return `${num}个反应`;
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `在《${repo}》数据库中创建了《${branch}》分支`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `建立了《${milestone}》里程碑`;
    },
    'story-$name-created-$page': (name, page) => {
        return `建立了wiki页面《${page}》”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        var text = `建立了`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `数据库`;
        return text;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `删除了wiki页面《${page}》”`;
    },
    'story-$name-joined-$repo': (name, repo) => {
        var text = `加入了`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `数据库`;
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        var text = `离开了`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `数据库`;
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        var text = `将`;
        if (branches && branches.length > 0) {
            var sources = branches.map((branch) => {
                return `《${branch}》`;
            });
            text += `${sources.join('、')}分支的代码合并到`;
        }
        if (repo) {
            text += `《${repo}》数据库的`;
        }
        text += `《${branch}》分支`;
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        var text = `开了问题${number}`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        var text = `推了一些代码修改入到`
        if (repo) {
            text += `《${repo}》数据库的`;
        }
        text += `《${branch}》分支`;
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `要求将《${branch1}》分支合并到《${branch2}》分支`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `修正了wiki页面《${page}》`;
    },
    'story-add-coauthor': '加合著者',
    'story-add-remove-coauthor': '替代合著者',
    'story-audio': '音频',
    'story-author-$count-others': (count) => {
        var num = cardinalS(count);
        return `另外${num}个人`;
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, '和', name2 ];
    },
    'story-cancel': '取消',
    'story-cancel-are-you-sure': '你确定要取消这个贴文？',
    'story-cancel-edit-are-you-sure': '你确定要取消这些更正？',
    'story-coauthors': '合著者',
    'story-comment': '留言',
    'story-drop-files-here': '在此处拖放媒体文件',
    'story-file': '文件',
    'story-issue-current-status': '当前状态：',
    'story-issue-status-closed': '关闭',
    'story-issue-status-opened': '开设',
    'story-issue-status-reopened': '重开',
    'story-like': '喜欢',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': '截止日期：',
    'story-milestone-start-date': '开始日期：',
    'story-options': '选项',
    'story-paste-image-here': '粘贴到文本编辑器中的图像会在这里出现',
    'story-pending': '听候⋯⋯',
    'story-photo': '照片',
    'story-post': '发送',
    'story-push-added-$count-files': (count) => {
        return `加了${count}个文件`;
    },
    'story-push-added-$count-lines': (count) => {
        return `加了${count}行代码`;
    },
    'story-push-components-changed': '更改了以下部分：',
    'story-push-deleted-$count-files': (count) => {
        return `删除了${count}个文件`;
    },
    'story-push-deleted-$count-lines': (count) => {
        return `删除了${count}行代码`;
    },
    'story-push-modified-$count-files': (count) => {
        return `修改了${count}个文件`;
    },
    'story-push-renamed-$count-files': (count) => {
        return `改了${count}个文件的名`;
    },
    'story-remove-yourself': '放弃作者权力',
    'story-remove-yourself-are-you-sure': '你确定你不要做这个贴文的合著者？',
    'story-status-storage-pending': '等待连接',
    'story-status-transcoding-$progress': (progress) => {
        return `转码（${progress}%）`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `上传（${progress}%）`;
    },
    'story-survey': '调查',
    'story-task-list': '任务列表',
    'story-video': '影片',
    'story-vote-submit': '递交',

    'telephone-dialog-close': '关闭',

    'time-$hours-ago': (hours) => {
        var num = cardinal(hours);
        return `${num}小时前`;
    },
    'time-$hr-ago': (hr) => {
        var num = cardinal(hr);
        return `${num}小时前`;
    },
    'time-$min-ago': (min) => {
        var num = cardinal(min);
        return `${num}分钟前`;
    },
    'time-$minutes-ago': (minutes) => {
        var num = cardinal(minutes);
        return `${num}分钟前`;
    },
    'time-just-now': '刚才',
    'time-yesterday': '昨天',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        return `上传${num}个文件，剩下${size}`;
    },

    'user-actions': '行动',

    'user-activity-$name-created-branch': '建立了一个分支',
    'user-activity-$name-created-merge-request': '发出一个合并请求',
    'user-activity-$name-created-milestone': '建立了一个里程碑',
    'user-activity-$name-created-repo': '建立了一个git数据库',
    'user-activity-$name-edited-wiki-page': '编辑了一个wiki页面',
    'user-activity-$name-joined-repo': '加入了数据库',
    'user-activity-$name-left-repo': '离开了数据库',
    'user-activity-$name-merged-code': '合并了代码',
    'user-activity-$name-opened-issue': '开了一个问题',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        var num = cardinalS(count);
        return `新增了${num}个音频剪辑`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        var num = cardinalS(count);
        return `新增了${num}个网页链接`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        var num = cardinalS(count);
        return `新增了${num}张相片`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        var num = cardinalS(count);
        return `新增了${num}张影片`;
    },
    'user-activity-$name-pushed-code': '将代码推送到数据库',
    'user-activity-$name-reported-issue': '报告了一个问题',
    'user-activity-$name-started-survey': '发布了一个调查',
    'user-activity-$name-started-task-list': '发布了一个任务列表',
    'user-activity-$name-was-assigned-issue': '被分配到一个问题',
    'user-activity-$name-wrote-post': '写了一个贴文',
    'user-activity-back': '返回',
    'user-activity-more': '更多',

    'user-image-remove': '删除',
    'user-image-select': '选择',
    'user-image-snap': '拍照',

    'user-info-email': '电子邮件地址',
    'user-info-gender': '性别',
    'user-info-gender-female': '女性',
    'user-info-gender-male': '男性',
    'user-info-gender-unspecified': '未指定',
    'user-info-name': '名称',
    'user-info-phone': '电话号码',

    'user-statistics-legend-branch': '分支',
    'user-statistics-legend-issue': '问题',
    'user-statistics-legend-member': '成员变更',
    'user-statistics-legend-merge': '代码合并',
    'user-statistics-legend-merge-request': '合并请求',
    'user-statistics-legend-milestone': '里程碑',
    'user-statistics-legend-post': '贴文',
    'user-statistics-legend-push': '推送',
    'user-statistics-legend-repo': '数据库修改',
    'user-statistics-legend-survey': '调查',
    'user-statistics-legend-task-list': '任务列表',
    'user-statistics-legend-wiki': 'wiki修改',
    'user-statistics-today': '今天',
    'user-statistics-tooltip-$count-branch': (count) => {
        return `${count}个分支`;
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return `${count}个问题`
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return `${count}个成员变更`;
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return `${count}个代码合并`;
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return `${count}个合并請求`;
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return `${count}个里程碑`
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return `${count}个贴文`;
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return `${count}个代码推送`;
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return `${count}个数据库变更`;
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return `${count}个调查`;
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return `${count}个任务列表`;
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return `${count}个wiki修改`;
    },

    'video-capture-accept': '接受',
    'video-capture-cancel': '取消',
    'video-capture-pause': '暂停',
    'video-capture-resume': '继续',
    'video-capture-retake': '重新录制',
    'video-capture-start': '开始',
    'video-capture-stop': '停止',
};

var cantonesePhrases = {
    'action-view-github-page': '睇佢嘅GitHub網頁',
    'action-view-gitlab-page': '睇佢嘅GitLab網頁',
    'action-view-linkedin-page': '睇佢嘅LinkedIn網頁',
    'action-view-stackoverflow-page': '睇佢嘅StackOverflow網頁',

    'bookmark-$name-and-$others-recommend-this': (name, others) => {
        return [ name, '同', others, `都推薦呢個` ];
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name}推薦呢個`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name) => {
        return [ name1, '同', name2, '都推薦呢個' ];
    },
    'bookmark-$you-bookmarked-it': '你加咗個書籤',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `你加咗個書籤（${name}推薦）`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others) => {
        return [ `你加咗個書籤（`, others, `推薦）` ];
    },

    'bookmarks-no-bookmarks': '冇書籤',

    'bottom-nav-people': '仆街',

    'membership-request-$you-are-member': '你係呢個項目嘅成員',
    'membership-request-$you-are-now-member': '你而家係呢個項目嘅成員',
    'membership-request-$you-have-requested-membership': '你要求成為呢個項目嘅成員',

    'mobile-device-revoke-are-you-sure': '你確定要吊銷此裝置嘅授權？',

    'news-no-stories-by-role': '冇呢個角色嘅人嘅故事',
    'news-no-stories-found': '搵唔到配合嘅故事',
    'news-no-stories-on-date': '嗰日冇故事',
    'news-no-stories-yet': '重未有故事',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name}邀請你一齊寫一個帖子`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = '推送'; break;
            case 'merge': story = '合併'; break;
            case 'branch': story = '分支'; break;
            case 'survey': story = '調查'; break;
            case 'task-list': story = '任務列表'; break;
            case 'post': story = '帖子'; break;
            default: story = '故事';
        }
        return `${name}回應咗你嘅${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name}完成咗喺你個列表上嘅一個任務`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = '推送'; break;
            case 'merge': story = '合併'; break;
            case 'branch': story = '分支'; break;
            case 'survey': story = '調查'; break;
            case 'task-list': story = '任務列表'; break;
            case 'post': story = '帖子'; break;
            default: story = '故事';
        }
        return `${name}鍾意你嘅${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = '一個回應中';
        return `${name}喺${reaction}提到你`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = '一個調查上'; break;
            case 'task-list': story = '一個任務列表上'; break;
            case 'post': story = '一個貼文中'; break;
            case 'issue': story = '一個問題上'; break;
            case 'merge-request': story = '一個合併請求中'; break;
            default: story = '一個故事中';
        }
        return `${name}喺${story}提到你`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name}開咗一個問題`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name}發布咗一個調查`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name}要求加入呢個項目`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name}回答咗你嘅調查`;
    },
    'notification-option-assignment': '當你被分配到一個問題',
    'notification-option-bookmark': '當你收到人哋嘅書籤',
    'notification-option-coauthor': '當有人想同你一齊寫帖子',
    'notification-option-comment': '當有人回應你嘅帖子',
    'notification-option-issue': '當有人開咗一個問題',
    'notification-option-join-request': '當有人想加入呢個項目',
    'notification-option-like': '當有人鍾意你嘅帖子',
    'notification-option-mention': '當有人喺故事或回應中提到你',
    'notification-option-note': '當有人喺提交或問題上發布回應',
    'notification-option-push': '當有人推啲代碼入到git數據庫',
    'notification-option-task-completion': '當有人完成你列表上嘅任務',
    'notification-option-vote': '當有人回答你嘅調查',
    'notification-option-web-session': '當你用緊網絡瀏覽器查嘞睇呢個網站',

    'notifications-no-notifications-on-date': '嗰日冇通知',
    'notifications-no-notifications-yet': '重未有通知',

    'option-edit-post': '編輯帖子',
    'option-hide-comment': '非成員睇唔到',
    'option-hide-story': '非成員睇唔到',
    'option-send-bookmarks': '發送書籤俾其他人',
    'option-send-bookmarks-to-$count-users': (count) => {
        var num = cardinalT(count);
        return `發送書籤俾${num}個人`;
    },
    'option-statistics-biweekly': '顯示前十四日嘅活動',
    'option-statistics-monthly': '顯示呢個月嘅活動',
    'option-statistics-to-date': '顯示直到今日嘅活動',

    'people-no-stories-found': '搵唔到配合嘅故事',
    'people-no-stories-on-date': '嗰日冇活動',
    'people-no-users-by-role': '冇項目成員有呢個角色',
    'people-no-users-yet': '重未有項目成員',

    'person-no-stories-found': '沒有找到匹配的故事',
    'person-no-stories-on-date': '嗰日冇故事',
    'person-no-stories-yet': '重未有故事',

    'project-management-mobile-set-up': '手機設置',
    'project-management-sign-out-are-you-sure': '你確定你想從該服務器註銷？',

    'qr-scanner-invalid-qr-code': '唔正確嘅ＱＲ碼',
    'qr-scanner-qr-code-found': '搵找到ＱＲ碼',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name}把呢個帖子放到問題跟踪器上`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name}投咗一票`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name}回應咗呢個分支`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name}回應咗呢個問題`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name}回應咗呢個合併`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name}回應咗呢個合併請求`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name}回應咗呢個推送`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name}完成咗一個任務`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name}被分配到呢個問題`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name}被分配到呢個合併請求`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name}啱啱改緊一個回應⋯⋯`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name}啱啱寫緊一個回應⋯⋯`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name}鍾意呢個`;
    },

    'role-filter-no-roles': '冇角色',

    'settings-device': '流動裝置',
    'settings-devices': '流動裝置',
    'settings-mobile-alert': '流動裝置警報',

    'start-no-projects': '冇項目',
    'start-no-servers': '冇OAuth提供者',

    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `喺《${repo}》數據庫中創建咗《${branch}》分支`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `建立咗《${milestone}》里程碑`;
    },
    'story-$name-created-$page': (name, page) => {
        return `建立咗wiki頁面《${page}》”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        var text = `建立咗`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `數據庫`;
        return text;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `刪除咗wiki頁面《${page}》”`;
    },
    'story-$name-joined-$repo': (name, repo) => {
        var text = `加入咗`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `數據庫`;
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        var text = `離開咗`;
        if (repo) {
            text += `《${repo}》`;
        }
        text += `數據庫`;
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        var text = `將`;
        if (branches && branches.length > 0) {
            var sources = branches.map((branch) => {
                return `《${branch}》`;
            });
            text += `${sources.join('、')}分支嘅代碼合併到`;
        }
        if (repo) {
            text += `《${repo}》數據庫嘅`;
        }
        text += `《${branch}》分支`;
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        var text = `開咗問題${number}`;
        if (title) {
            text += `： ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        var text = `推咗一啲代碼修改入到`
        if (repo) {
            text += `《${repo}》數據庫嘅`;
        }
        text += `《${branch}》分支`;
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `要求將《${branch1}》分支合併到《${branch2}》分支`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `修正咗wiki頁面《${page}》`;
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, '同', name2 ];
    },
    'story-cancel-are-you-sure': '你確定要取消呢個帖子？',
    'story-cancel-edit-are-you-sure': '你確定要取消呢啲改變？',
    'story-comment': '回應',
    'story-drop-files-here': '喺呢度放媒體文件',
    'story-like': '鍾意',
    'story-paste-image-here': '放喺文本編輯器嘅圖像會係呢度出現',
    'story-pending': '等緊⋯⋯',
    'story-push-added-$count-files': (count) => {
        return `加咗${count}個文件`;
    },
    'story-push-added-$count-lines': (count) => {
        return `加咗${count}行代碼`;
    },
    'story-push-components-changed': '更改咗以下部分：',
    'story-push-deleted-$count-files': (count) => {
        return `刪除咗${count}個文件`;
    },
    'story-push-deleted-$count-lines': (count) => {
        return `刪除咗${count}行代碼`;
    },
    'story-push-modified-$count-files': (count) => {
        return `修改咗${count}個文件`;
    },
    'story-push-renamed-$count-files': (count) => {
        return `改咗${count}個文件嘅名`;
    },
    'story-remove-yourself-are-you-sure': '你確定你唔要做呢個帖子嘅合著者？',
    'story-status-uploading-$progress': (progress) => {
        return `上載（${progress}%）`;
    },

    'time-$hours-ago': (hours) => {
        var num = cardinal(hours);
        return `${num}個鐘頭前`;
    },
    'time-$hr-ago': (hr) => {
        var num = cardinal(hr);
        return `${num}個鐘頭前`;
    },
    'time-just-now': '啱啱線',
    'time-yesterday': '尋日',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        return `上載緊${num}個文件，重有${size}`;
    },

    'user-activity-$name-created-branch': '建立咗一個分支',
    'user-activity-$name-created-milestone': '建立咗一個里程碑',
    'user-activity-$name-created-repo': '建立咗一個git數據庫',
    'user-activity-$name-edited-wiki-page': '編輯咗一個wiki頁面',
    'user-activity-$name-joined-repo': '加入咗數據庫',
    'user-activity-$name-left-repo': '離開咗數據庫',
    'user-activity-$name-merged-code': '合併咗一啲代碼',
    'user-activity-$name-opened-issue': '開咗一個問題',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        var num = cardinalT(count);
        return `新增咗${num}個音頻剪輯`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        var num = cardinalT(count);
        return `新增咗${num}個網頁鏈接`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        var num = cardinalT(count);
        return `新增咗${num}張相片`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        var num = cardinalT(count);
        return `新增咗${num}張影片`;
    },
    'user-activity-$name-reported-issue': '報告咗一個問題',
    'user-activity-$name-started-survey': '發布咗一個調查',
    'user-activity-$name-started-task-list': '發布咗一個任務列表',
    'user-activity-$name-wrote-post': '寫咗一個帖子',

    'user-statistics-legend-post': '帖子',
    'user-statistics-today': '今日',
    'user-statistics-tooltip-$count-post': (count) => {
        return `${count}個帖子`;
    },
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
