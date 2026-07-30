import { RouterProvider } from 'react-router-dom'
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
        </ChurchProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

export default App
