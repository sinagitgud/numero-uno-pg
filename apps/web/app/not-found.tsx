export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>404</h1>
        <p style={{ color: '#666' }}>Page not found.</p>
        <a href="/" style={{ color: '#7C3AED', textDecoration: 'underline', fontSize: '14px' }}>Go home</a>
      </body>
    </html>
  );
}
