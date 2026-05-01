import { ThemeProvider } from '../components/ThemeContext';
import { AuthProvider }  from '../components/AuthContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}
