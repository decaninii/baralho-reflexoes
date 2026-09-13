import './globals.css';

export const metadata = {
  title: 'Baralho de Reflexões',
  description: 'Reflexões diárias por temas, com áudio e aprofundamento.',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
