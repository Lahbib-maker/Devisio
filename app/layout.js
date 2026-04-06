import './globals.css'

export const metadata = {
  title: 'Devios — Devis professionnels pour artisans',
  description: 'Générez des devis professionnels en 30 secondes. PDF légal, envoi email, suivi client. Pour électriciens, plombiers, peintres, maçons.',
  keywords: 'devis artisan, logiciel devis, devis bâtiment, devis électricien, devis plombier, devis maçon',
  metadataBase: new URL('https://devios.fr'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Devios — Devis professionnels pour artisans',
    description: 'Générez des devis professionnels en 30 secondes. PDF légal, envoi email, suivi client.',
    url: 'https://devios.fr',
    siteName: 'Devios',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devios — Devis pour artisans',
    description: 'Devis professionnel en 30 secondes. PDF conforme, envoi direct.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Devios',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1B2D4F',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Devios" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {})
            })
          }
        `}} />
      </body>
    </html>
  )
}
