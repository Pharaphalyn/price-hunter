export const socket = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@depth@1000ms');

export const getSocketByCurrency = (currency) => {
  return currency ? new WebSocket(`wss://stream.binance.com:9443/ws/${currency}@depth@1000ms`) : socket
}

export const getSocketByValue = (currency) => {
  return currency ? new WebSocket(`wss://stream.binance.com:9443/ws/${currency}t@depth@1000ms`) : socket
}