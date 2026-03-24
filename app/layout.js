import './globals.css';

export const metadata = {
  title: 'games.bytelabs.online // terminal',
  description: 'OG terminal-styled game index with multi-system support.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
