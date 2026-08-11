import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
        Plan &amp; Lyrics
      </h1>
      <p className="max-w-md text-lg text-gray-600 mb-8">
        Organiza tus servicios y prepara las letras para cada reunión.
      </p>
      <div className="flex items-center gap-4">
        <Link to="/sign-in">
          <Button variant="primary" className="font-semibold px-8 h-12 text-base">
            Iniciar sesión
          </Button>
        </Link>
      </div>
    </div>
  )
}
