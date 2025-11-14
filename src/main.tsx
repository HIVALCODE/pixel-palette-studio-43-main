import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Default the app to dark mode so the dark design tokens are active immediately.
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
