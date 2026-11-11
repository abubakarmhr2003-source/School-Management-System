import './globals.css';
import TableLabels from '@/components/TableLabels';
export const metadata = { title: 'School Management System' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0F3D2E' };
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" /></head>
      <body suppressHydrationWarning>{children}<TableLabels /></body>
    </html>
  );
}
