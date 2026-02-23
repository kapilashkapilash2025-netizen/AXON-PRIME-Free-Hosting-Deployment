import './globals.css';

export const metadata = {
  title: 'AXON PRIME - Risk Guard Pro',
  description: 'Capital protection intelligence platform for disciplined traders.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
