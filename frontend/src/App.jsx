import React from "react";
import AppRouter from "./router/AppRouter";
import { useDarkMode } from "./hooks/useDarkMode";

function App() {
  useDarkMode(); // initialise dark/light class on <html> for the whole app
  return <AppRouter />;
}

export default App;
