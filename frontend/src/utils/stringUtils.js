/**
 * 文字列内の全角英数字、記号、スペースを半角に変換します。
 * @param {string} str 変換する文字列
 * @returns {string} 半角に変換された文字列
 */
export const toHalfWidth = (str) => {
  if (!str) return '';
  return str.replace(/[！-～]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  }).replace(/＠/g, '@').replace(/　/g, ' ');
};
