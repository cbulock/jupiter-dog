import { BrowserRouter, Route, Routes } from "react-router-dom";

// import Admin from "./Admin";
import Home from "./Home";

import "./App.css";

export default () => (
  <BrowserRouter>
    <Routes>
      <Route index element={<Home />} />
    </Routes>
  </BrowserRouter>
);
