require('moment/locale/zh-cn');
require('moment/locale/zh-hk');

module.exports = function(languageCode) {
    var cantonese = false;
    var traditional = false;
    if (/\-(mo|hk)$/.test(languageCode)) {
        cantonese = true;
        traditional = true;
    } else if (/\-(tw)$/.test(languageCode)) {
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
    'action-view-github-page': '查看Github個人頁面',
    'action-view-gitlab-page': '查看GitLab個人頁面',
    'action-view-stackoverflow-page': '查看StackOverflow個人頁面',

    'app-name': '電車吧',

    'audio-capture-accept': '接受',
    'audio-capture-cancel': '取消',
    'audio-capture-pause': '暫停',
    'audio-capture-rerecord': '重新錄製',
    'audio-capture-start': '開始',
    'audio-capture-stop': '停止',

    'bookmark-$count-other-users': (count) => {
        var num = cardinal(count);
        return `另外${num}個人`;
    },
    'bookmark-$count-users': (count) => {
        var num = cardinal(count);
        return `${num}個人`;
    },
    'bookmark-$name-and-$users-recommend-this': (name, users, count) => {
        return [ `${name}和`, users, `推薦這個` ];
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name}推薦這個`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name) => {
        return `${name1}和${name2}推薦這個`;
    },
    'bookmark-recommendations': '推薦',
    'bookmark-you-bookmarked-it': '你加了這個書籤',
    'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
        return `你加了這個書籤（${name}推薦）`;
    },
    'bookmark-you-bookmarked-it-and-$users-recommends-it': (name, users, count) => {
        return [ `你加了這個書籤（`, users, `推薦）` ];
    },

    'bottom-nav-bookmarks': '書籤',
    'bottom-nav-news': '信息',
    'bottom-nav-notifications': '通知',
    'bottom-nav-people': '人們',
    'bottom-nav-settings': '設置',

    'comment-$user-cast-a-vote': (user) => {
        return `${user}投票`;
    },
    'comment-$user-commented-on-issue': (user) => {
        return `${user}評論了這個問題`;
    },
    'comment-$user-commented-on-merge-request': (user) => {
        return `${user}評論了這個合併請求`;
    },
    'comment-$user-commented-on-push': (user) => {
        return `${user}評論了這個提交`;
    },
    'comment-$user-completed-a-task': (user) => {
        return `${user}完成了一個任務`;
    },
    'comment-$user-is-assigned-to-issue': (user) => {
        return `${user}被分配到這個問題`;
    },
    'comment-$user-is-typing': (user) => {
        return `${user}正在寫評論⋯⋯`;
    },
    'comment-$user-likes-this': (user) => {
        return `${user}喜歡這個`;
    },

    'list-$count-more': (count) => {
        var num = cardinal(count);
        return `還有${num}個⋯⋯`;
    },

    'media-close': '關閉',
    'media-download-original': '下載原本文件',
    'media-next': '下一個',
    'media-previous': '上一個',

    'notification-$user-commented-on-your-commit': (user) => {
        return `${user}評論了你的commit`;
    },
    'notification-$user-commented-on-your-merge': (user) => {
        return `${user}評論了你的merge`;
    },
    'notification-$user-commented-on-your-story': (user) => {
        return `${user}評論了你的公報`;
    },
    'notification-$user-commented-on-your-survey': (user) => {
        return `${user}評論了你的調查`;
    },
    'notification-$user-commented-on-your-task-list': (user) => {
        return `${user}評論了你的任務列表`;
    },
    'notification-$user-completed-task': (user) => {
        return `${user}完成了在你的列表上一個任務`;
    },
    'notification-$user-likes-your-commit': (user) => {
        return `${user}喜歡你的commit`;
    },
    'notification-$user-likes-your-merge': (user) => {
        return `${user}喜歡你的merge`;
    },
    'notification-$user-likes-your-story': (user) => {
        return `${user}喜歡你的公報`;
    },
    'notification-$user-likes-your-survey': (user) => {
        return `${user}喜歡你的調查`;
    },
    'notification-$user-likes-your-task-list': (user) => {
        return `${user}喜歡你的任務列表`;
    },
    'notification-$user-voted-in-your-survey': (user) => {
        return `${user}回答了你的調查`;
    },

    'option-add-bookmark': '加書籤',
    'option-add-issue': '加問題入跟蹤管理系統',
    'option-bookmark-story': '加書籤',
    'option-edit-post': '編輯訊息',
    'option-hide-post': '非會員看不到',
    'option-send-bookmarks': '發送書籤給他人',
    'option-send-bookmarks-to-$count-users': (count) => {
        var num = cardinal(count);
        return `發送書籤給${num}個人`;
    },
    'option-show-media': '顯示附件媒體',
    'option-show-preview': '顯示課文預覽',

    'photo-capture-accept': '接受',
    'photo-capture-cancel': '取消',
    'photo-capture-retake': '重拍',
    'photo-capture-snap': '拍照',

    'selection-cancel': '取消',
    'selection-ok': '接受',

    'settings-language': '語言',
    'settings-notification': '通知',
    'settings-projects': '項目',
    'settings-user-profile': '用戶資料',

    'statistics-bar': '條圖',
    'statistics-line': '線圖',
    'statistics-pie': '餅圖',

    'story-$count-user-reacted-to-story': (count) => {
        var num = cardinal(count);
        return `${num}個人有反應`;
    },
    'story-add-coauthor': '加合著者',
    'story-add-remove-coauthor': '替代合著者',
    'story-audio': '音頻',
    'story-author-$count-others': (count) => {
        var num = cardinal(count);
        return `另外${num}個人`;
    },
    'story-author-$name-and-$users': (name, users, count) => {
        return [ name, '和', users ];
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return `${name1}和${name2}`;
    },
    'story-cancel': '取消',
    'story-coauthors': '合著者',
    'story-comment': '評論',
    'story-file': '文件',
    'story-issue-current-status': '當前狀態:',
    'story-issue-opened-$number-$title': (number, title) => {
        var num = String(number);
        return `報告了問題${num}：《${title}》`;
    },
    'story-issue-status-closed': '關閉',
    'story-issue-status-opened': '開設',
    'story-issue-status-reopened': '重開',
    'story-like': '喜歡',
    'story-markdown': 'Markdown',
    'story-member-joined-$repo': (repo) => {
        var text = `加入了項目`;
        if (repo) {
            text += `《${repo}》`;
        }
        return text;
    },
    'story-member-left-$repo': (repo) => {
        var text = `離開了項目`;
        if (repo) {
            text += `《${repo}》`;
        }
        return text;
    },
    'story-milestone-created-$name': (name) => {
        return `加了里程碑《${name}》`;
    },
    'story-milestone-due-date': '截止日期：',
    'story-milestone-start-date': '開始日期：',
    'story-options': '選項',
    'story-pending': '听候⋯⋯',
    'story-photo': '照片',
    'story-post': '發送',
    'story-push-added-$count-files': (count) => {
        var num = cardinal(count);
        return `加了${num}個文件`;
    },
    'story-push-added-$count-lines': (count) => {
        var num = cardinal(count);
        return `加了${num}行代碼`;
    },
    'story-push-modified-$count-files': (count) => {
        var num = cardinal(count);
        return `改了${num}行代碼`;
    },
    'story-push-pushed-to-$branch-of-$repo': (branch, repo) => {
        var text = `推了一些代碼修改入到`
        if (repo) {
            text += `項目《${repo}》的`;
        }
        text += `分支《${branch}》`;
        return text;
    },
    'story-push-removed-$count-files': (count) => {
        return `除了${num}個文件`;
    },
    'story-push-removed-$count-lines': (count) => {
        return `除了${num}行代碼`;
    },
    'story-push-renamed-$count-files': (count) => {
        return `改了${num}個文件的名`;
    },
    'story-repo-created-$name': (name) => {
        var text = `創建項目`;
        if (name) {
            text += `《${name}》`;
        }
        return text;
    },
    'story-survey': '調查',
    'story-task-list': '任務列表',
    'story-video': '視頻',
    'story-vote-submit': '遞交',
    'story-wiki-created-page-with-$title': (title) => {
        return `創建了維基頁面《${title}》”`;
    },
    'story-wiki-deleted-page-with-$title': (title) => {
        return `刪除了維基頁面《${title}》”`;
    },
    'story-wiki-updated-page-with-$title': (title) => {
        return `修正了維基頁面《${title}》`;
    },

    'survey-item-$number': (number) => {
        var num = String(number);
        return `精選${num}`;
    },
    'task-list-item-$number': (number) => {
        var num = String(number);
        return `任務${num}`;
    },

    'user-actions': '行動',

    'user-statistics-legend-issue': '問題',
    'user-statistics-legend-milestone': '里程碑',
    'user-statistics-legend-push': '推送',
    'user-statistics-legend-story': '公報',
    'user-statistics-legend-survey': '調查',
    'user-statistics-legend-task-list': '任務列表',
    'user-statistics-legend-wiki': '維基編輯',

    'video-capture-accept': '接受',
    'video-capture-cancel': '取消',
    'video-capture-pause': '暫停',
    'video-capture-retake': '重新錄製',
    'video-capture-start': '開始',
    'video-capture-stop': '停止',
};

// TODO
var simplifiedPhrases = traditionalPhrases;

var cantonesePhrases = {
    'action-view-github-page': '睇吓佢嘅Github個人頁面',
    'action-view-gitlab-page': '睇吓佢嘅GitLab個人頁面',
    'action-view-stackoverflow-page': '睇吓佢嘅StackOverflow個人頁面',

    'bookmark-$name-and-$users-recommend-this': (name, users, count) => {
        return [ `${name}同`, users, `推薦呢個` ];
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name}推薦呢個`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name) => {
        return `${name1}同${name2}推薦呢個`;
    },
    'bookmark-recommendations': '推薦',
    'bookmark-you-bookmarked-it': '你加咗呢個書籤',
    'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
        return `你加咗呢個書籤（${name}推薦）`;
    },
    'bookmark-you-bookmarked-it-and-$users-recommends-it': (name, users, count) => {
        return [ `你加咗呢個書籤（`, users, `推薦）` ];
    },

    'comment-$user-cast-a-vote': (user) => {
        return `${user}投咗一票`;
    },
    'comment-$user-commented-on-issue': (user) => {
        return `${user}評論咗呢個問題`;
    },
    'comment-$user-commented-on-merge-request': (user) => {
        return `${user}評論咗呢個合併請求`;
    },
    'comment-$user-commented-on-push': (user) => {
        return `${user}評論咗呢個push`;
    },
    'comment-$user-completed-a-task': (user) => {
        return `${user}完成咗一個任務`;
    },
    'comment-$user-is-assigned-to-issue': (user) => {
        return `${user}被分配到呢個問題`;
    },
    'comment-$user-is-typing': (user) => {
        return `${user}現在寫緊評論⋯⋯`;
    },
    'comment-$user-likes-this': (user) => {
        return `${user}鍾意呢個`;
    },

    'list-$count-more': (count) => {
        var num = cardinal(count);
        return `重有${num}個⋯⋯`;
    },

    'notification-$user-commented-on-your-commit': (user) => {
        return `${user}評論咗你嘅commit`;
    },
    'notification-$user-commented-on-your-merge': (user) => {
        return `${user}評論咗你嘅merge`;
    },
    'notification-$user-commented-on-your-story': (user) => {
        return `${user}評論咗你嘅公報`;
    },
    'notification-$user-commented-on-your-survey': (user) => {
        return `${user}評論咗你嘅調查`;
    },
    'notification-$user-commented-on-your-task-list': (user) => {
        return `${user}評論咗你嘅任務列表`;
    },
    'notification-$user-completed-task': (user) => {
        return `${user}完成咗喺你嘅列表嘅上一個任務`;
    },
    'notification-$user-likes-your-commit': (user) => {
        return `${user}鍾意你嘅commit`;
    },
    'notification-$user-likes-your-merge': (user) => {
        return `${user}鍾意你嘅merge`;
    },
    'notification-$user-likes-your-story': (user) => {
        return `${user}鍾意你嘅公報`;
    },
    'notification-$user-likes-your-survey': (user) => {
        return `${user}鍾意你嘅調查`;
    },
    'notification-$user-likes-your-task-list': (user) => {
        return `${user}鍾意你嘅任務列表`;
    },
    'notification-$user-voted-in-your-survey': (user) => {
        return `${user}回答咗你嘅調查`;
    },

    'option-hide-post': '非會員睇唔到',
    'option-send-bookmarks': '發送書籤畀其他人',
    'option-send-bookmarks-to-$count-users': (count) => {
        var num = cardinal(count);
        return `發送書籤畀${num}個人`;
    },

    'story-author-$name-and-$users': (name, users, count) => {
        return [ name, '同', users ];
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return `${name1}同${name2}`;
    },
    'story-issue-opened-$number-$title': (number, title) => {
        var num = String(number)
        return `報告咗問題${num}：《${title}》`;
    },
    'story-like': '鍾意',
    'story-member-joined-$repo': (repo) => {
        var text = `加入咗project`;
        if (repo) {
            text += `《${repo}》`;
        }
        return text;
    },
    'story-member-left-$repo': (repo) => {
        var text = `離開咗project`;
        if (repo) {
            text += `《${repo}》`;
        }
        return text;
    },
    'story-milestone-created-$name': (name) => {
        return `加咗里程碑《${name}》`;
    },
    'story-pending': '等一陣⋯⋯',
    'story-push-added-$count-files': (count) => {
        var num = cardinal(count);
        return `加咗${num}個文件`;
    },
    'story-push-added-$count-lines': (count) => {
        var num = cardinal(count);
        return `加咗${num}行代碼`;
    },
    'story-push-modified-$count-files': (count) => {
        var num = cardinal(count);
        return `改咗${num}行代碼`;
    },
    'story-push-pushed-to-$branch-of-$repo': (branch, repo) => {
        var text = `推咗一啲代碼修改入到`
        if (repo) {
            text += `project《${repo}》嘅`;
        }
        text += `branch《${branch}》`;
        return text;
    },
    'story-push-removed-$count-files': (count) => {
        return `除咗${num}個文件`;
    },
    'story-push-removed-$count-lines': (count) => {
        return `除咗${num}行代碼`;
    },
    'story-push-renamed-$count-files': (count) => {
        return `改咗${num}個文件嘅名`;
    },
    'story-repo-created-$name': (name) => {
        var text = `加咗project`;
        if (name) {
            text += `《${name}》`;
        }
        return text;
    },
    'story-wiki-created-page-with-$title': (title) => {
        return `加咗Wiki頁面《${title}》”`;
    },
    'story-wiki-deleted-page-with-$title': (title) => {
        return `刪除咗Wiki頁面《${title}》”`;
    },
    'story-wiki-updated-page-with-$title': (title) => {
        return `改咗Wiki頁面《${title}》`;
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
