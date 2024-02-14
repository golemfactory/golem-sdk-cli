import { useYagna } from "@golem-sdk/react";
import { useRef } from "react";

export function ConnectToYagna() {
  const { setYagnaOptions } = useYagna();
  const appKeyInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="installation-instructions">
      <p>
        Make sure yagna is running on your local machine. Please follow the instructions in this{" "}
        <a
          className="link"
          target="_blank"
          href="https://docs.golem.network/docs/creators/javascript/examples/tools/yagna-installation-for-requestors"
          rel="noreferrer"
        >
          quickstart
        </a>{" "}
        to learn more about how to install and run yagna.
      </p>
      <p>
        Make sure to start the process with the <i> --api-allow-origin</i> flag:
        <code>{`yagna service run --api-allow-origin='${window.location.origin}'`}</code>
      </p>
      <label>
        Yagna app-key:
        <input type="text" placeholder="Enter your app-key" ref={appKeyInputRef} />
      </label>
      <label>
        Yagna url:
        <input type="text" placeholder="Enter your url" ref={urlInputRef} defaultValue="http://127.0.0.1:7465" />
      </label>
      <button
        className="connect-button"
        onClick={() => {
          if (appKeyInputRef.current && urlInputRef.current) {
            setYagnaOptions({
              apiKey: appKeyInputRef.current.value,
              basePath: urlInputRef.current.value,
            });
          }
        }}
      >
        Connect to Yagna
      </button>
    </div>
  );
}
