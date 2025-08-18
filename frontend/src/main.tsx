import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import App from './App.tsx';
import './index.css';

function RootApp() {
  useEffect(() => {
    // Delete old input files
    fetch("http://localhost:8080/delete_old/", { method: "POST" })
      .then(res => res.json())
      .then(data => console.log("Deleted input files:", data));

    // Delete old audio files
    fetch("http://localhost:8080/delete_old_audio/", { method: "POST" })
      .then(res => res.json())
      .then(data => console.log("Deleted audio files:", data));
  }, []); // runs only once on page refresh

  return <App />;
}

// 🔥 Clear browser storage whenever page is refreshed
localStorage.clear();
sessionStorage.clear();

createRoot(document.getElementById("root")!).render(<RootApp />);
