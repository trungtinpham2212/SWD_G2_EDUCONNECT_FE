import React, { useState } from 'react';
import Sidebar from "./components/Sidebar";

function App() {
  const [active, setActive] = useState("Trang chủ");

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold">Trang: {active}</h2>
        {/* Nội dung động tùy theo mục được chọn */}
      </div>
    </div>
  );
}

export default App;
