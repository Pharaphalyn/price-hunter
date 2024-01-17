import { useEffect, useMemo, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import { Toaster } from "react-hot-toast";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ConfigField } from "./CoinField";
import useWebSocket, { ReadyState } from "react-use-websocket";

function PoolTracker(props) {
  const [showTransition, setShowTransition] = useState(false);
  
  const [chartData, setChartData] = useState([]);
  const [hunterPoint, setHunterPoint] = useState({});
  const [newPoint, setNewPoint] = useState();
  const [lowNet, setLowNet] = useState(0.005);
  const [highNet, setHighNet] = useState(0.04);
  const socketUrl = 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker';

	const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
		socketUrl,
	);
  const [messageHistory, setMessageHistory] = useState([]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  useEffect(() => {
    async function getData() {
      // const data = (await (await fetch('https://api.twelvedata.com/time_series?apikey=0af8ce03eb6644599938a1c21bef7238&interval=1min&symbol=BTC/ETH',
      //   {headers: {'Content-type': 'application/json'}, mode: 'cors'})).json()).values.reverse();
      // const hunter = setUpHunter(data[data.length - 1].open, data[data.length - 1].datetime);
      // redrawChart(data, hunter);
    }
    sendJsonMessage({
      method: 'SUBSCRIBE',
      params: ['dogeaud@ticker'],
      id: 1,
    });
    getData();
    setShowTransition(true);
  }, []);
  
  useEffect(() => {
    if (lastJsonMessage !== null) {
      addPoint(lastJsonMessage.o);
      setMessageHistory((prev) => prev.concat(lastJsonMessage));
    }
  }, [lastJsonMessage, setMessageHistory]);

  function setUpHunter(value, datetime) {
    return {
      hunter: value,
      datetime,
      topLine: value * (1 + lowNet),
      bottomLine: value * (1 - lowNet)
    }
  }

  function checkHunt(hunter, point) {
    // console.log(hunter.hunter, point, hunter.topLine);
    if (point > hunter.topLine) {
      hunter = setUpHunter(hunter.topLine, (new Date()).toISOString());
      return checkHunt(hunter, point);
    }
    if (point < hunter.bottomLine) {
      hunter = setUpHunter(hunter.bottomLine, (new Date()).toISOString());
      return checkHunt(hunter, point);
    }
    return hunter;
  }

  function redrawChart(data, hunter = hunterPoint) {
    if (!hunter || !hunter.hunter) {
      hunter = setUpHunter(data[data.length - 1].open, new Date());
    }
    // let hunter = hunterPoint;
    data.forEach(el => {
      el.datetime = (new Date(el.datetime)).toISOString();
      delete el.hunter;
      delete el.topLine;
      delete el.bottomLine;
      if (new Date(el.datetime) <= new Date(hunter.datetime)) {
        return;
      }
      if (hunter) {
        hunter = checkHunt(hunter, el.open);
      }
    });
    for (let i = 4; i > 0; i--) {
      if (!data[data.length - i]) {
        continue;
      }
      data[data.length - i].topLine = hunter.topLine;
      data[data.length - i].bottomLine = hunter.bottomLine;
    }
    hunter.datetime = data[data.length - 1].datetime;
    setHunterPoint(hunter);
    if (data[data.length - 2]) {
      data[data.length - 2].hunter = hunter.hunter;
    }
    if (data.length > 30) {
      data.shift();
    }
    setChartData(data);
  }

  function addPoint(point = newPoint, datetime = new Date()) {
    if (!point) {
    return console.log(point);
    }
    const data = chartData;
    data.push({open: point, datetime: datetime});
    redrawChart(data);
  }

  const handleChange = {
    newPoint: (e) => {
      console.log(e.target.value);
      setNewPoint(e.target.value);
    }
  };

  function tickFormatter(value) {
    return value.toFixed(2);
  }

  const CustomizedDot = ({cx, cy, value}) => {
    return (
        <circle key={value} cx={cx} cy={cy} r={4} fill={value ? 'red' : 'transparent'} />
    );
  };

  return (
    <div className="flex justify-center min-h-screen sm:px-16 px-6">
      <div className="flex justify-between items-center flex-col max-w-[1280px] w-full">
        <div className="flex-1 flex justify-start items-center flex-col w-full mt-2">
          <div className="mt-10 w-full flex justify-center">
            <div className="relative md:max-w-[700px] md:min-w-[500px] min-w-full max-w-full p-[2px] rounded-3xl">
              <div className="w-full bg-primary-gray backdrop-blur-[4px] rounded-3xl shadow-card flex flex-col p-10">
                  <div className="mb-6 w-[100%]">
                    <ConfigField
                      activeField={true}
                      value={newPoint}
                      onChange={handleChange.newPoint}
                      fieldName="New Point"
                    />
                    <button onClick={() => addPoint()}>Add</button>
                  </div>
                  <LineChart key={'lc' + chartData.length} margin={{left: 10}} width={500} height={500} data={chartData}>
                    <Line isAnimationActive={false} key={'l1' + chartData.length} dot={false} type="linear" dataKey="open" stroke="#8884d8" />
                    <Line isAnimationActive={false} dot={CustomizedDot} key={'l2' + chartData.length} dataKey="hunter" />
                    <Line isAnimationActive={false} key={'l3' + chartData.length} dot={false} dataKey="bottomLine" />
                    <Line isAnimationActive={false} key={'l4' + chartData.length} dot={false} dataKey="topLine" />
                    <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                    <XAxis dataKey="datetime" />
                    <YAxis tickFormatter={tickFormatter} type="number" domain={[dataMin => dataMin * 0.999, dataMax => dataMax * 1.001]} />
                    <Tooltip />
                  </LineChart>
                  {connectionStatus}
                  {JSON.stringify(lastJsonMessage?.data, null, 4)}
                  {messageHistory?.current?.map((message, idx) => (
                    <span key={idx}>
                      {JSON.stringify(message?.data, null, 4)}
                    </span>
                  ))}
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
