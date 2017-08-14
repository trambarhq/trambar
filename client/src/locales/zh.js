module.exports = function(languageCode) {
    return traditional;
};

var traditional = {
    'action-contact-by-email': '電子郵件聯繫',
    'action-contact-by-ichat': 'iChat聯繫',
    'action-contact-by-phone': '電話聯繫',
    'action-contact-by-skype': 'Skype聯繫',
    'action-contact-by-slack': 'Slack聯繫',
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
    'bookmark-you-bookmarked-it': '你加入這個書籤',
    'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
        return `你加入這個書籤（${name}推薦）`;
    },
    'bookmark-you-bookmarked-it-and-$users-recommends-it': (name, users, count) => {
        return [ `你加入這個書籤（`, users, `推薦）` ];
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
        return `${user}完成一個任務`;
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

var cardinalNumbers = [ '〇', '一', '二', '三', '四', '五', '六', '七', '八', '九' ];

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
        return cardinalNumbers[num];
    } else if (num < 100) {
        var text = '十';
        var tens = Math.floor(num / 10);
        var ones = Math.floor(num % 10);
        if (tens > 1) {
            text = cardinalNumbers[tens] + text;
        }
        if (ones) {
            text = text + cardinalNumbers[tens];
        }
        return text;
    } else {
        var text = String(num);
        var fullWidth = '';
        for (var i = 0; i < text.length; i++) {
            var c = text.charCodeAt(i);
            fullWidth += String.fromCharCode(c + 0xff10 - 0x0030);
        }
        return fullWidth;
    }
}
