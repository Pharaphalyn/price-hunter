import React from "react";
import Web3ProviderCore from "./network";
import NarBar from "./NavBar/NavBar";
import PoolTracker from "./PoolTracker/PoolTracker";
import { Route } from "react-router-dom";
import { Web3ReactProvider } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";

const getLibrary = (provider) => {
  const library = new Web3Provider(provider);
  return library;
};

const App = () => {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderCore
        render={(network, setupConnection) => (
          <div>
            <NarBar />
            <PoolTracker
              network={network}
              setupConnection={setupConnection}
            />
          </div>
        )}
      ></Web3ProviderCore>
    </Web3ReactProvider>
  );
};

export default App;
