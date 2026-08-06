import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ChurchProvider } from '@/app/providers/ChurchProvider'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { router } from '@/app/router'

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ChurchProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-center"
            gutter={8}
            toastOptions={{
              duration: 5_000,
              ariaProps: { role: 'status', 'aria-live': 'polite' },
              style: { maxWidth: 'calc(100vw - 2rem)', padding: '12px 16px' },
            }}
          />
        </ChurchProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

export default App
