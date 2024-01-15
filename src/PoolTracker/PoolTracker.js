import { useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import { Toaster } from "react-hot-toast";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ConfigField } from "./CoinField";

function PoolTracker(props) {
  const [showTransition, setShowTransition] = useState(false);
  
  const [chartData, setChartData] = useState([]);
  const [hunterPoint, setHunterPoint] = useState({});
  const [scale, setScale] = useState([0, 0]);
  const [gradient, setGradient] = useState(1);
  const [newPoint, setNewPoint] = useState();

  useEffect(() => {
    async function getData() {
      const data = await (await fetch('https://api.twelvedata.com/time_series?apikey=0af8ce03eb6644599938a1c21bef7238&interval=1min&symbol=BTC/ETH',
        {headers: {'Content-type': 'application/json'}, mode: 'cors'})).json();
      // data.values.push(hunter);
      const hunter = data.values[data.values.length - 1].open;
      data.values[data.values.length - 2].hunter = hunter; 
      setHunterPoint({hunter, datetime: data.values[data.values.length - 1].datetime});
      setChartData(data.values);
    }
    getData();
    setShowTransition(true);
  }, []);

  function redrawChart(data) {
    data[data.length - 2].hunter = hunterPoint.hunter;
    setChartData(data);
  }

  function addPoint() {
    console.log(chartData);
    const data = chartData;
    data.push({open: newPoint, datetime: (new Date()).toISOString()});
    redrawChart(data);
  }

  const handleChange = {
    newPoint: (e) => {
      setNewPoint(e.target.value);
    },
    scale1: (e) => {
      setScale([scale[0], e.target.value]);
    },
    gradient: (e) => {
      setGradient(e.target.value);
    },
  };

  return (
    <div className="flex justify-center min-h-screen sm:px-16 px-6">
      <div className="flex justify-between items-center flex-col max-w-[1280px] w-full">
        <div className="flex-1 flex justify-start items-center flex-col w-full mt-2">
          <div className="mt-10 w-full flex justify-center">
            <div className="relative md:max-w-[700px] md:min-w-[500px] min-w-full max-w-full p-[2px] rounded-3xl">
              <div className="w-full bg-primary-gray backdrop-blur-[4px] rounded-3xl shadow-card flex flex-col p-10">
                  <Transition
                    appear={true}
                    show={showTransition}
                    enter="transition ease-out duration-500"
                    enterFrom="opacity-0 translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-500"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <div className="mb-6 w-[100%]">
                      <ConfigField
                        activeField={true}
                        value={newPoint}
                        onChange={handleChange.newPoint}
                        fieldName="New Point"
                      />
                      <button onClick={addPoint}>Add</button>
                    </div>
                    <LineChart margin={{left: 20}} width={500} height={500} data={chartData}>
                      <Line key={chartData.length} dot={false} type="linear" dataKey="open" stroke="#8884d8" />
                      <Line dataKey="hunter" />
                      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                      <XAxis dataKey="datetime" />
                      <YAxis type="number" domain={[hunterPoint.hunter - 1, hunterPoint.hunter + 1]} />
                      <Tooltip />
                    </LineChart>
                  </Transition>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: "border border-primary-green",
          duration: 5000,
          style: {
            background: "#15171A",
            color: "#65B3AD",
          },
        }}
      />
    </div>
  );
}

export default PoolTracker;
