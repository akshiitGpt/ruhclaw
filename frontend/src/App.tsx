import { BrowserRouter, Routes, Route } from "react-router";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:agentId" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}
