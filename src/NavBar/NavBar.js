import { Link, useLocation } from "react-router-dom";
import Connect from "../Components/Connect";

const Navbar = () => {
  return (
    <nav className="bg-primary-gray">
      <div className="mx-auto max-w-7xl p-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-around">
          <div className="flex items-center justify-center sm:items-stretch sm:justify-start text-primary-green font-bold text-2xl">
            W a v e R i d e r
          </div>
          <Connect></Connect>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
