import '@/styles/globals.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider } from '@mantine/core';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider>
      <Component {...pageProps} />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1f2937', // bg-gray-800
            color: '#ffffff',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981', // green
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444', // red
              secondary: '#ffffff',
            },
          },
        }}
      />
    </MantineProvider>
  );
}
