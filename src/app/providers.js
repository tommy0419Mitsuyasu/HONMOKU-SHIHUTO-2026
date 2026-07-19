'use client';

import { AuthProvider, DataProvider } from '@/lib/providers';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </AuthProvider>
  );
}
