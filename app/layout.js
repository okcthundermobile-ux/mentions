import './globals.css';

export const metadata = {
  title: 'Thunder Hub — OKC Roster, News & Fan Pulse',
  description: 'Oklahoma City Thunder stats, news, and fan sentiment.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <a href="/" className="wordmark">
            THUNDER<span>HUB</span>
          </a>
          <nav>
            <a href="/">Roster</a>
            <a href="/news">News</a>
            <a href="/pulse">Fan Pulse</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Data: NBA Stats · NewsAPI · Reddit · Sentiment: Gemini API.
          Not affiliated with the NBA or the Oklahoma City Thunder.
        </footer>
      </body>
    </html>
  );
}
