import type { Metadata } from 'next';
import './globals.css';
import { AccountProvider } from '../context/AccountContext';
import { Shell } from '../components/Shell';
export const metadata: Metadata = {
  title:'Brújula Financiera — Aprende a invertir',
  description:'Tu primera cartera, tus operaciones, y formación financiera explicada paso a paso.',
  icons:{icon:'/icon.svg'},
  robots:{index:false,follow:false},
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="es"><body><AccountProvider><Shell>{children}</Shell></AccountProvider></body></html>;
}
