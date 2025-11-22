import { BrowserRouter } from 'react-router-dom'
import Routes from './routes.jsx'
import Navbar from './components/Navbar.jsx'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes />
      </div>
    </BrowserRouter>
  )
}

export default App