import './globals.css';
import Providers from './providers';

export const metadata = {
  title: '本牧市民プール シフト管理システム',
  description: '本牧市民プールのアルバイトスタッフ向けシフト管理アプリケーション。シフト提出・承認・タイムライン表示を一元管理します。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
