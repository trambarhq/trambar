function cardinalT(num, sg, pl) {
  if (num === 1) {
    return replaceNumberT(sg, num);
  } else {
    return replaceNumberT(pl || sg, num);
  }
}

function cardinalS(num, sg, pl) {
  if (num === 1) {
    return replaceNumberS(sg, num);
  } else {
    return replaceNumberS(pl || sg, num);
  }
}

function number(num, literals) {
  if (num < 10) {
    return literals[num];
  } else {
    return String(num);
  }
}

const numberRegExp = /\d+/;
const chineseNumberRegExp = /[〇零一二兩两三四五六七八九十]+/;
const traditionalChineseNumbers = [ '零', '一', '兩', '三', '四', '五', '六', '七', '八', '九' ]
const simplifiedChineseNumbers = [ '〇', '一', '两', '三', '四', '五', '六', '七', '八', '九' ]

function replaceNumberT(s, num) {
  if (numberRegExp.test(s)) {
    return s.replace(numberRegExp, num);
  } else {
    let n = number(num, traditionalChineseNumbers);
    return s.replace(chineseNumberRegExp, n);
  }
}

function replaceNumberS(s, num) {
  if (numberRegExp.test(s)) {
    return s.replace(numberRegExp, num);
  } else {
    let n = number(num, simplifiedChineseNumbers);
    return s.replace(chineseNumberRegExp, n);
  }
}

function list(items) {
  items = items.map((item) => {
    return `${item}`;
  });
  if (items.length >= 2) {
    let lastItem = items.pop();
    items[items.length - 1] += `和${lastItem}`;
  }
  return items.join('，');
}

export {
  cardinalT,
  cardinalS,
  list,
};
