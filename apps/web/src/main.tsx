import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const App = () => (
  <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <h1 className="text-4xl font-bold text-indigo-900 mb-2">Numidia Voyages & Tourisme</h1>
    <p className="text-sand-500 max-w-md">
      Découvrez l'Algérie authentique : Sahara, Tassili n'Ajjer, oasis du Gourara et séjours
      méditerranéens.
    </p>
  </main>
);

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
