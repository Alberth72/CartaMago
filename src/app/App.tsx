import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router'
import { AppRouter } from './AppRouter'

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </HelmetProvider>
  )
}
