import golemLogo from "./assets/golem.svg";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import "./App.css";
import { useYagna } from "@golem-sdk/react";
import { NodeVersionCheck } from "./components/NodeVersionCheck";
import { ConnectToYagna } from "./components/ConnectToYagna";

function App() {
  const { isConnected } = useYagna();

  return (
    <>
      <div>
        <a href="https://docs.golem.network" target="_blank" rel="noreferrer">
          <img src={golemLogo} className="logo" alt="Golem logo" />
        </a>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Golem + Vite + React</h1>
      <h2>Yagna is {isConnected ? "connected" : "not connected"}</h2>
      {!isConnected && <ConnectToYagna />}
      <div className="card">{isConnected && <NodeVersionCheck />}</div>
      <div className="card">
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="read-the-docs">Click on the Golem, Vite or React logos to learn more</p>
    </>
  );
}

export default App;
