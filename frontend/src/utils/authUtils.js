// Base64URLデコード関数
const base64UrlDecode = (str) => {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += '==';
      break;
    case 3:
      output += '=';
      break;
    default:
      throw new Error('Illegal base64url string!');
  }
  // atobはブラウザ標準の関数
  return decodeURIComponent(atob(output).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
};

// トークンからユーザー情報を取得する
export const getUserFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
    // トークンの有効期限をチェック
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    return payload.user;
  } catch (error) {
    console.error('トークンのデコードに失敗しました:', error);
    localStorage.removeItem('token');
    return null;
  }
};
