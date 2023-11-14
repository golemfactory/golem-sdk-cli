import golemLogo from "./assets/golem.svg";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import "./App.css";
import { useYagna } from "@golem-sdk/react";
import { NodeVersionCheck } from "./components/NodeVersionCheck.jsx";

function App() {
  const { isConnected } = useYagna();

  return (
    <>
      <div>
        <a href="https://docs.golem.network" target="_blank">
          <img src={golemLogo} className="logo" alt="Golem logo" />
        </a>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Golem + Vite + React</h1>
      <h2>Yagna is {isConnected ? "connected" : "not connected"}</h2>
      {!isConnected && (
        <p className="installation-instructions">
          Looks like yagna is not running on your local machine. Please follow the instructions in the{" "}
          <a
            className="link"
            target="_blank"
            href="https://docs.golem.network/docs/creators/javascript/examples/tools/yagna-installation-for-requestors"
          >
            quickstart
          </a>
          . Make sure to start the process with the <code>--api-allow-origin</code> flag:
          <br />
          <code>{`yagna service run --api-allow-origin='${window.location.origin}'`}</code>
        </p>
      )}
      <div className="card">{isConnected && <NodeVersionCheck />}</div>
      <div className="card">
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>

      <p className="read-the-docs">Click on the Golem, Vite or React logos to learn more</p>
    </>
  );
}

export default App;
