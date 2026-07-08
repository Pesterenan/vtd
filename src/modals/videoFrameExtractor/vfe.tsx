import { createRoot } from "react-dom/client";
import VFEApp from "./VFEApp";
import "../../assets/main.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");
const root = createRoot(rootElement);
root.render(<VFEApp />);
