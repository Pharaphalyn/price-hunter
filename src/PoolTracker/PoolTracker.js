import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ConfigField } from "./CoinField";
import useWebSocket from "react-use-websocket";
import { Shark } from "../assets";
const CustomTooltip = ({ active, payload, label }) => {
  const getName = (name) => {
    switch (name) {
      case 'open':
        return 'Price';
      case 'topLine':
        return 'Low Top Line';
      case 'bottomLine':
        return 'Low Bottom Line';
      case 'highBottomLine':
        return 'High Bottom Line';
      case 'highTopLine':
        return 'High Top Line';
      case 'hunter':
        return 'Hunter';
      default:
        return name;
    }
  }

  if (active && payload && payload.length) {
    return (
      <div className="bg-primary-black text-white p-5 rounded">
        <p className="label mb-5 text-gray-400">{label.toLocaleString()}</p>
        {payload.map((el, index) => {
          return (<p key={index} className="label">
            {getName(el.name)}: {el.value}
          </p>)
        })}
        {/* <p className="intro">{getIntroOfPage(label)}</p> */}
      </div>
    );
  }

  return null;
};

function PoolTracker() {
  const [chartData, setChartData] = useState([]);
  const [hunterPoint, setHunterPoint] = useState({});
  const [lowNet, setLowNet] = useState(0.0005);
  const [highNet, setHighNet] = useState(0.004);
  const [lowNetInput, setLowNetInput] = useState(lowNet * 100);
  const [highNetInput, setHighNetInput] = useState(highNet * 100);
  const [log, setLog] = useState([]);
  const socketUrl = 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker';

	const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
		socketUrl,
	);

  useEffect(() => {
    async function getData() {
      // const data = (await (await fetch('https://api.twelvedata.com/time_series?apikey=0af8ce03eb6644599938a1c21bef7238&interval=1min&symbol=BTC/ETH',
      //   {headers: {'Content-type': 'application/json'}, mode: 'cors'})).json()).values.reverse();
      // const hunter = setUpHunter(data[data.length - 1].open, data[data.length - 1].datetime);
      // redrawChart(data, hunter);
    }
    sendJsonMessage({
      method: 'SUBSCRIBE',
      params: ['pricehunter@ticker'],
      id: 1,
    });
    const chart = [];
    for (let i = 0; i < 30; i++) {
      chart.push({});
    }
    setChartData(chart);
    getData();
  }, []);
  
  useEffect(() => {
    if (lastJsonMessage !== null) {
      addPoint(lastJsonMessage.o);
    }
  }, [lastJsonMessage]);

  function setUpHunter(value, datetime, status = hunterPoint.status) {
    return {
      hunter: value,
      datetime,
      topLine: status === 'top' ? null : value * (1 + lowNet),
      bottomLine: status === 'bottom' ? null : value * (1 - lowNet),
      highTopLine: status === 'top' ? value / (1 + lowNet) * (1 + highNet) : value * (1 + highNet),
      highBottomLine: status === 'bottom' ? value / (1 - lowNet) * (1 - highNet) : value * (1 - highNet),
      status
    }
  }

  function checkHunt(hunter, point) {
    if (point > hunter.highTopLine) {
      hunter = setUpHunter(hunter.highTopLine, new Date(), null);
      addLog(`Hunter crossed the high top threshold! New hunter position: ${hunter.hunter}.`, 'primary-green');
      return checkHunt(hunter, point);
    }
    if (point < hunter.highBottomLine) {
      hunter = setUpHunter(hunter.highBottomLine, new Date(), null);
      addLog(`Hunter crossed the high bottom threshold! New hunter position: ${hunter.hunter}.`, 'primary-green');
      return checkHunt(hunter, point);
    }
    if (hunter.topLine && point > hunter.topLine) {
      hunter = setUpHunter(hunter.topLine, new Date(), hunter.status ? null : 'top');
      if (hunter.status === null) {
        addLog(`Congratulations! Hunter crossed both thresholds. New hunter position: ${hunter.hunter}.`, 'primary-green');
      } else {
        addLog(`Hunter crossed the low top threshold! New hunter position: ${hunter.hunter}.`, 'primary-yellow');
      }
      return checkHunt(hunter, point);
    }
    if (hunter.bottomLine && point < hunter.bottomLine) {
      hunter = setUpHunter(hunter.bottomLine, new Date(), hunter.status ? null : 'bottom');
      if (hunter.status === null) {
        addLog(`Congratulations! Hunter crossed both thresholds. New hunter position: ${hunter.hunter}.`, 'primary-green');
      } else {
        addLog(`Hunter crossed the low bottom threshold! New hunter position: ${hunter.hunter}.`, 'primary-yellow');
      }
      return checkHunt(hunter, point);
    }
    return hunter;
  }

  function redrawChart(data, hunter = hunterPoint) {
    if (!hunter || !hunter.hunter) {
      hunter = setUpHunter(data[data.length - 1].open, new Date());
    }
    data.forEach(el => {
      delete el.hunter;
      delete el.topLine;
      delete el.bottomLine;
      delete el.highTopLine;
      delete el.highBottomLine;
      if (new Date(el.datetime) <= new Date(hunter.datetime)) {
        return;
      }
    });
    if (hunter) {
      hunter = checkHunt(hunter, data[data.length - 1].open);
    }
    for (let i = 4; i > 0; i--) {
      if (!data[data.length - i]) {
        continue;
      }
      data[data.length - i].topLine = hunter.topLine;
      data[data.length - i].bottomLine = hunter.bottomLine;
      data[data.length - i].highTopLine = hunter.highTopLine;
      data[data.length - i].highBottomLine = hunter.highBottomLine;
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

  function addPoint(point, datetime = new Date()) {
    const data = chartData;
    data.push({open: point, datetime: datetime});
    redrawChart(data);
  }

  const handleChange = {
    lowNet: (e) => setLowNetInput(e.target.value),
    highNet: (e) => setHighNetInput(e.target.value)
  };

  const setNets = () => {
    setLowNet(lowNetInput / 100);
    setHighNet(highNetInput / 100);
    setTimeout(() => {
      const hunter = setUpHunter(hunterPoint.hunter, new Date(), null);
      setHunterPoint(hunter);
    });
    addLog(`New nets. Low: ${lowNetInput}%. High: ${highNetInput}%.`)
  }

  function addLog(message, color='white') {
    const logArr = log;
    logArr.push({message, datetime: new Date(), color});
    setLog(logArr);
  }

  function tickFormatter(value) {
    if (!value || !value.toFixed) {
      console.log(value);
    }
    return value && value.toFixed ? value.toFixed(2) : '';
  }

  function dateFormatter(value) {
    if (!value) {
      return '';
    }
    return value.toLocaleTimeString();
  }

  const CustomizedDot = ({cx, cy, value}) => {
    return (
        <Shark x={cx} y={cy} classes={value ? '' : 'hidden'} />
    );
  };

  return (
    <div className="w-full bg-primary-gray backdrop-blur-[4px] shadow-card flex flex-col p-10">
      <div className="w-[100%] flex justify-between">
        <ConfigField
          activeField={true}
          value={lowNetInput}
          onChange={handleChange.lowNet}
          fieldName="Low Net (%)"
        />
        <ConfigField
          activeField={true}
          value={highNetInput}
          onChange={handleChange.highNet}
          fieldName="High Net (%)"
        />
      </div>
      <div className="flex justify-center">
        <button
          className="w-64 bg-primary-green text-white border-none outline-none px-12 py-2 font-poppins font-semibold text-md rounded-lg my-4 mb-5"
          onClick={setNets}
        >Set Nets</button>
      </div>
      <ResponsiveContainer aspect={2}>
        <LineChart key={'lc' + chartData.length} margin={{left: 20}} data={chartData}>
          <Line isAnimationActive={false} key={'l1' + chartData.length} dot={false} type="linear" dataKey="open" stroke="#8884d8" />
          <Line isAnimationActive={false} dot={CustomizedDot} key={'l2' + chartData.length} dataKey="hunter" />
          <Line isAnimationActive={false} key={'l3' + chartData.length} dot={false} stroke="#facc15" dataKey="bottomLine" />
          <Line isAnimationActive={false} key={'l4' + chartData.length} dot={false} stroke="#facc15" dataKey="topLine" />
          <Line isAnimationActive={false} key={'l5' + chartData.length} dot={false} stroke="#65B3AD" strokeWidth={2} dataKey="highBottomLine" />
          <Line isAnimationActive={false} key={'l6' + chartData.length} dot={false} stroke="#65B3AD" strokeWidth={2} dataKey="highTopLine" />
          <XAxis tickFormatter={dateFormatter} dataKey="datetime" />
          <YAxis tickFormatter={tickFormatter}
            orientation="right"
            ticks={[hunterPoint.highBottomLine,
              hunterPoint.bottomLine,
              chartData.length ? +chartData[chartData.length - 1].open : 100,
              hunterPoint.topLine,
              hunterPoint.highTopLine]}
            type="number"
            domain={[dataMin => dataMin * 0.999, dataMax => dataMax * 1.001]} />
          <Tooltip content={<CustomTooltip />} />
        </LineChart>
      </ResponsiveContainer>
      <div className="bg-primary-black text-white p-5 mt-10">Log</div>
      <div className="bg-primary-black text-white overflow-auto h-96 p-5">
        {log.map((el, index) => {
          return (
            <div key={index}>
              <span className="text-gray-400 mr-10">{el.datetime.toLocaleString()}</span>
              <span className={`text-${el.color}`}>{el.message}</span>
            </div>);
        })}
      </div>
    </div>
  );
}

export default PoolTracker;
