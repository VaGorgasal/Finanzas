import type { Metadata } from 'next';
import './globals.css';
import './design.css';
import './interior.css';
import { AccountProvider } from '../context/AccountContext';
import { Shell } from '../components/Shell';
export const metadata: Metadata = {
  title:'Brújula Financiera — Aprende a invertir',
  description:'Tu patrimonio, tu cartera y tus objetivos. Un espacio personal para darle perspectiva a tu dinero.',
  icons:{icon:'/icon.svg'},
  robots:{index:false,follow:false},
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="es" data-scroll-behavior="smooth"><body><AccountProvider><Shell>{children}</Shell></AccountProvider></body></html>;
}
