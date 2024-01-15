import { BigNumber, Contract, ethers } from "ethers";
import * as chains from "./constants/chains";

const ROUTER = require("./build/IFairSwapRouter.json");
const ORACLE = require("./build/IOracleContract.json");
const ERC20 = require("./build/ERC20.json");
const FACTORY = require("./build/IFairSwapFactory.json");
const PAIR = require("./build/IFairSwapPair.json");
const PAIRERC20 = require("./build/IFairSwapERC20.json");

export let currentId = 0;

export function getProvider() {
  return new ethers.providers.Web3Provider(window.ethereum);
}

export function getSigner(provider) {
  return provider.getSigner();
}

export async function getNetwork(provider) {
  const network = await provider.getNetwork();
  return network.chainId;
}

export function getRouter(address, signer) {
  return new Contract(address, ROUTER.abi, signer);
}

export function getOracle(address, signer) {
  return new Contract(address, ORACLE.abi, signer);
}

export async function checkNetwork(provider) {
  const chainId = getNetwork(provider);
  if (chains.networks.includes(chainId)){
    return true
  }
  return false;
}

export function getWeth(address, signer) {
  return new Contract(address, ERC20.abi, signer);
}

export function getFactory(address, signer) {
  return new Contract(address, FACTORY.abi, signer);
}

export async function getAccount() {
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  return accounts[0];
}

//This function checks if a ERC20 token exists for a given address
//    `address` - The Ethereum address to be checked
//    `signer` - The current signer
export function doesTokenExist(address, signer) {
  try {
    return new Contract(address, ERC20.abi, signer);
  } catch (err) {
    return false;
  }
}

export async function getDecimals(token) {
  const decimals = await token.decimals().then((result) => {
      return result;
    }).catch((error) => {
      console.log('No tokenDecimals function for this token, set to 0');
      return 0;
    });
    return decimals;
}

// This function returns an object with 2 fields: `balance` which container's the account's balance in the particular token,
// and `symbol` which is the abbreviation of the token name. To work correctly it must be provided with 4 arguments:
//    `accountAddress` - An Ethereum address of the current user's account
//    `address` - An Ethereum address of the token to check for (either a token or AUT)
//    `provider` - The current provider
//    `signer` - The current signer
export async function getBalanceAndSymbol(
  accountAddress,
  address,
  provider,
  signer,
  weth_address,
  coins
) {
  try {
    if (address === weth_address) {
      const balanceRaw = await provider.getBalance(accountAddress);

      return {
        balance: ethers.utils.formatEther(balanceRaw),
        symbol: coins[0].abbr,
        decimals: 18
      };
    } else {
      const token = new Contract(address, ERC20.abi, signer);
      const tokenDecimals = await getDecimals(token);
      const balanceRaw = await token.balanceOf(accountAddress);
      const symbol = await token.symbol();

      return {
        balance: ethers.utils.formatUnits(balanceRaw, tokenDecimals),
        symbol: symbol,
        decimals: tokenDecimals
      };
    }
  } catch (error) {
    console.log('getBalanceAndSymbol error', error);
    return false;
  }
}

// This function swaps two particular tokens / AUT, it can handle switching from AUT to ERC20 token, ERC20 token to AUT, and ERC20 token to ERC20 token.
// No error handling is done, so any issues can be caught with the use of .catch()
// To work correctly, there needs to be 7 arguments:
//    `address1` - An Ethereum address of the token to trade from (either a token or AUT)
//    `address2` - An Ethereum address of the token to trade to (either a token or AUT)
//    `amount` - A float or similar number representing the value of address1's token to trade
//    `routerContract` - The router contract to carry out this trade
//    `accountAddress` - An Ethereum address of the current user's account
//    `signer` - The current signer
export async function swapTokens(
  address1,
  address2,
  routes,
  amount,
  routerContract,
  accountAddress,
  signer
) {
  const tokens = routes.map((e) => e.address);
  const time = Math.floor(Date.now() / 1000) + 200000;
  const deadline = ethers.BigNumber.from(time);

  const token1 = new Contract(address1, ERC20.abi, signer);
  const token1Decimals = Number(await getDecimals(token1));
  
  const amountIn = parseUnits(amount, token1Decimals);

  let tx;
  if (BigNumber.from(await token1.allowance(accountAddress, routerContract.address)).lt(amountIn)) {
    tx = await token1.approve(routerContract.address, amountIn);
    await tx.wait();
  }
  const wethAddress = await routerContract.WETH();

  if (address1 === wethAddress) {
    // Eth -> Token
    tx = await routerContract.swapExactETHForTokens(
      0,
      tokens,
      accountAddress,
      deadline,
      { value: amountIn }
    );
    await tx.wait();
  } else if (address2 === wethAddress) {
    // Token -> Eth
    tx = await routerContract.swapExactTokensForETH(
      amountIn,
      0,
      tokens,
      accountAddress,
      deadline
    );
    await tx.wait();
  } else {
    tx = await routerContract.swapExactTokensForTokens(
      amountIn,
      0,
      tokens,
      accountAddress,
      deadline
    );
    await tx.wait();
  }
}

export function tradeComparator(a, b) { // a = old, b = new
  if (a[1] > b[1]) {
    return -1
  }
  if (a[1] < b[1]) {
    return 1
  }
  // finally consider the number of hops since each hop costs gas
  return a[0].length - b[0].length
}

export function sortedInsert(items, add, maxSize, comparator) {
  if (maxSize <= 0) return null
  // this is an invariant because the interface cannot return multiple removed items if items.length exceeds maxSize
  if (items.length > maxSize) return null

  // short circuit first item add
  if (items.length === 0) {
    items.push(add)
    return null
  } else {
    const isFull = items.length === maxSize
    // short circuit if full and the additional item does not come before the last item
    if (isFull && comparator(items[items.length - 1], add) <= 0) {
      return add
    }

    let lo = 0,
      hi = items.length

    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (comparator(items[mid], add) <= 0) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    items.splice(lo, 0, add)
    return isFull ? items.pop() : null
  }
}

export function removeTokens(tokens, tokensToRemove) {
  let result = [...tokens];
  for (let i = 0; i < tokensToRemove.length; ++i) {
    let indexToRemove = result.findIndex(obj => isSameAddress(obj.address, tokensToRemove[i]));
    if (indexToRemove !== -1) {
      result.splice(indexToRemove, 1);
    }
  }
  return result;
}

export function isSameAddress(addr1, addr2) {
  return addr1.toLowerCase() === addr2.toLowerCase();
}

function logTime(i, name, startedTime) {
  let endTime = Date.now();
  // console.log(i, name, (endTime - startedTime)/1000);
  return endTime;
}

export function interruptRouting() {
  currentId++;
}

export async function bestTradeExactIn(
  tokens,
  tokenIn,  // coin
  tokenOut, // coin
  amountIn, // BigNumber
  factoryContract, // Contract
  routerContract, // Contract
  signer,
  maxNumResults,
  maxHops,
  currentRoute = [],   // []
  bestTrades = [], // []
  setBestTrades,
  id
) {
  if (id < currentId) {
    return bestTrades;
  } else {
    currentId = id;
  }
  if (maxHops <= 0 || maxNumResults <= 0 || bestTrades.length >= maxNumResults) return bestTrades;
  
  for (let i = 0; i < tokens.length; ++i) {
    let startedTime = Date.now();
    const tokenFrom = {address: tokenIn.address};
    const tokenTo = {address: tokens[i].address};
    if (isSameAddress(tokenFrom.address, tokenTo.address)) {
      continue;
    }

    const pairAddress = await getPair(tokenFrom.address, tokenTo.address, factoryContract);
    if (isSameAddress(pairAddress, ethers.constants.AddressZero)) {
      continue;
    }
    startedTime = logTime(i, "getPair", startedTime);
    const pair = new Contract(pairAddress, PAIR.abi, signer);
    const reserves = await fetchReserves(tokenFrom.address, tokenTo.address, pair, signer);
    startedTime = logTime(i, "fetchReserves", startedTime);
    const amountOut = await getAmountOut(tokenFrom.address, tokenTo.address, amountIn, routerContract, signer); 
    startedTime = logTime(i, "getAmountOut", startedTime);
    if ((amountOut && amountOut.eq(0)) || amountOut.gt(reserves[1])) {
      continue;
    }
    if (id < currentId) {
      return bestTrades;
    } else {
      currentId = id;
    }
    // we have arrived at the output token, so this is the final trade of one of the paths
    if (isSameAddress(tokenTo.address, tokenOut.address)) {
      sortedInsert(
        bestTrades,
        [[...currentRoute, tokens[i]], formatUnits(amountOut, tokenOut.decimals)],
        maxNumResults,
        tradeComparator
      )
      setBestTrades(bestTrades);
    } else if (maxHops > 1) {
      const tokensRemaining = removeTokens(tokens, [tokenFrom.address, tokenTo.address]);
      await bestTradeExactIn(
        tokensRemaining,
        tokenTo,
        tokenOut,
        amountOut,
        factoryContract,
        routerContract,
        signer,
        maxNumResults,
        maxHops - 1,
        [...currentRoute, tokens[i]],
        bestTrades,
        setBestTrades,
        id
      );
      startedTime = logTime(i, "recursive bestTradeExactIn", startedTime);
    }
  }

  return bestTrades;
}

//This function returns the conversion rate between two token addresses
//    `address1` - An Ethereum address of the token to swaped from (either a token or AUT)
//    `address2` - An Ethereum address of the token to swaped to (either a token or AUT)
//    `amountIn` - Amount of the token at address 1 to be swaped from
//    `routerContract` - The router contract to carry out this swap
export async function getAmountOut(
  address1,
  address2,
  amountIn,
  factory,
  routerContract,
  signer
) {
  try {
    const pairAddress = await getPair(address1, address2, factory);
    if (pairAddress !== ethers.constants.AddressZero){
      const pair = new Contract(pairAddress, PAIR.abi, signer);
      const reservesRaw = await fetchReserves(address1, address2, pair, signer);
      const amountOutBN = await routerContract.getAmountOut(
        amountIn,
        reservesRaw[0],
        reservesRaw[1]
      );
      return amountOutBN;
    } else {
      return '0';
    }
  } catch (err) {
    console.log("getAmountOut error", {err})
    return 0;
  }
}

export async function getSubscription(tokenFrom, tokenTo, factory, signer) {
  const pairAddress = await getPair(tokenFrom, tokenTo, factory);
  const pair = new Contract(pairAddress, PAIR.abi, signer);
  
  const filter = pair.filters.Sync();
  return filter;
}

export async function getLastSwaps(tokenFrom, tokenTo, factoryContract, signer) {
  const pairAddress = await getPair(tokenFrom, tokenTo, factoryContract);
  const pair = new Contract(pairAddress, PAIR.abi, signer);
  // const reserves = await fetchReserves(tokenFrom.address, tokenTo.address, pair, signer);
  const currentBlock = await getProvider().getBlockNumber();
  
  // var event = await pair.getPastEvents(
  //   'Swap', // Feel free to change this to 'Transfer' to see only the transfer events 
  //   {
  //     // We fetch the latest block number and subtract 100 to ensure that
  //     // we get the events from the last 100 blocks.
  //     fromBlock: currentBlock - 100,
  //     toBlock: 'latest'
  //   }
  // );
  const filter = pair.filters.Swap();
  const events = await pair.queryFilter(filter, currentBlock - 1000, currentBlock);
  return events;
}

export async function getPair(tokenFrom, tokenTo, factoryContract) {
  const key = tokenFrom + tokenTo + factoryContract.address;
  if (!getPair.cache) {
    getPair.cache = {};
  }
  if (getPair.cache[key]){
    return getPair.cache[key];
  }
  try {
    const result = await factoryContract.getPair(tokenFrom, tokenTo);
    if (result !== ethers.constants.AddressZero) {
      getPair.cache[key] = result;
    }
    return result;
  } catch(e) {
    console.log(e);
    // await new Promise(r => setTimeout(r, 1000));
    // return await getPair(tokenFrom, tokenTo, factoryContract);
  }
}

export async function getPrice(tokenA, tokenB, precision, oracleContract) {
  const key = tokenA + tokenB + precision;
  if (!getPrice.cache) {
    getPrice.cache = {};
  }
  if (getPrice.cache[key]){
    return getPrice.cache[key];
  }
  try {
    const result = await oracleContract.getPrice(tokenA, tokenB, precision);
    getPrice.cache[key] = result;
    setTimeout(() => getPrice.cache[key] = null, 2 * 60 * 1000);
    return result;
  } catch(e) {
    console.log(e);
  }
}

// This function calls the pair contract to fetch the reserves stored in a the liquidity pool between the token of address1 and the token
// of address2. Some extra logic was needed to make sure that the results were returned in the correct order, as
// `pair.getReserves()` would always return the reserves in the same order regardless of which order the addresses were.
//    `address1` - An Ethereum address of the token to trade from (either a ERC20 token or AUT)
//    `address2` - An Ethereum address of the token to trade to (either a ERC20 token or AUT)
//    `pair` - The pair contract for the two tokens
export async function fetchReserves(address1, address2, pair, signer) {
  const key = address1 + address2 + pair?.address;
  if (!fetchReserves.cache) {
    fetchReserves.cache = {};
  }
  if (fetchReserves.cache[key]){
    return fetchReserves.cache[key];
  }
  try {
    // Get reserves
    const reservesRaw = await pair.getReserves();
    // Put the results in the right order
    const results =  [
      (await pair.token0()) === address1 ? reservesRaw[0] : reservesRaw[1],
      (await pair.token1()) === address2 ? reservesRaw[1] : reservesRaw[0],
    ];

    fetchReserves.cache[key] = results;
    setTimeout(() => fetchReserves.cache[key] = null, 2 * 60 * 1000);
    return fetchReserves.cache[key];
  } catch (err) {
    console.log("error!", err);
    return [0, 0];
  }
}

export async function getReserves(
  address1,
  address2,
  factory,
  signer,
  accountAddress
) {
  try {
    const pairAddress = await getPair(address1, address2, factory);
    if (pairAddress !== ethers.constants.AddressZero){
      const pairERC20 = new Contract(pairAddress, PAIRERC20.abi, signer);
      const pair = new Contract(pairAddress, PAIR.abi, signer);
      const reservesRaw = await fetchReserves(address1, address2, pair, signer);
      const liquidityTokens = await pairERC20.balanceOf(accountAddress);
    
      return [
        reservesRaw[0],
        reservesRaw[1],
        liquidityTokens,
      ];
    } else {
      console.log("no reserves yet");
      return [0,0,0];
    }
  } catch (err) {
    console.log("error!", err);
    return [0, 0, 0];
  }
}

export function setCoinPrice(coin, setCoinPrice, precision, coins, oracle) {
  setCoinPrice(null);
  const usdt = coins.find(el => el.name === 'USDT');
  if (coin.address && usdt) {
    getPrice(coin.address, usdt.address, precision, oracle)
      .then(data => setCoinPrice(data ? (+formatUnits(data, precision)).toFixed(2) : 0));
  }
}

export const parseUnits = (value, decimals) => {
  return ethers.utils.parseUnits(Number(value).toFixed(Number(decimals)), Number(decimals));
}

export const formatUnits = (value, decimals) => {
  return ethers.utils.formatUnits(value, decimals);
}