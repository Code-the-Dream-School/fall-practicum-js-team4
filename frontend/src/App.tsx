import { BrowserRouter } from 'react-router';
import { AppRoutes } from './AppRoutes';
import { AuthProvider } from './context/AuthProvider';
import { QueryProvider } from './app/QueryProvider';

function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryProvider>
    </AuthProvider>
  );
}

export default App;
