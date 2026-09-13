import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Experiment from "./Experiment.tsx";
import "../../index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <Experiment />
  </StrictMode>,
);
