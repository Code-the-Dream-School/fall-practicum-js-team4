import { useEffect, useState } from 'react';
import './App.css'

function App() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Call the backend API
    fetch('http://localhost:8080/api/hello')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch from backend');
        }
        return response.json();
      })
      .then((data) => {
        setMessage(data.message);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Frontend ↔ Backend Test</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!error && (
        <p>
          Message from API: <strong>{message}</strong>
        </p>
      )}
    </main>
  );
}

export default App
