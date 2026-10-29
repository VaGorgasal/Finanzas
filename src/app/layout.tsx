import type { Metadata } from 'next';
import './globals.css';
import { PortfolioProvider } from '../context/PortfolioContext';
import { Shell } from '../components/Shell';
export const metadata: Metadata = {
  title:'Brújula Financiera — Aprende a invertir',
  description:'Tu primera cartera, tus operaciones, y formación financiera explicada paso a paso.',
  icons:{icon:'/icon.svg'},
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="es"><body><PortfolioProvider><Shell>{children}</Shell></PortfolioProvider></body></html>;
}
