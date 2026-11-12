import type { Metadata, Viewport } from 'next'
import { Shell } from '../ui/shell'
import { t } from '../copy/register'
import '../styles/v2.css'
import '../styles/parts.css'
import '../styles/screens.css'
import '../styles/setup.css'
import '../styles/overlays.css'
import '../styles/base.css'

export const metadata: Metadata = {
  title: 'gaus',
  description: t('meta.description'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" data-mode="native">
      <body className="v">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
