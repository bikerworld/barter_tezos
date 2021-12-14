import React, { useEffect } from 'react'
import { TezosToolkit, OpKind } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import axios from 'axios'
import ReactDOM from 'react-dom'

const DEFAULT_NODE = 'https://mainnet.api.tez.ie'
const BEACON_NAME = 'barter.nftbiker.xyz'
export const NFT4NFT = 'KT1XtJ6k51y7HpLFLTNv2wBYFhfVMZ6ow3Sz'
const OBJKT_CONTRACT = 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton'
const BIGMAP_ID = 51052

export var Tezos = null
export var account;
var wallet = null;

// wallet connector

export const WalletConnector = (props) => {
  useEffect(() => {
    try { syncButton() } catch (e) { console.log(e) }
  }, [])

  const ButtonName = () => {
    if (account) return shorten_wallet(account.address)
    else return 'Connect'
  }

  const syncButton = () => {
    setAccount().then((ok) => {
      if (ok) {
        let div = document.getElementById("wallet_connector")
        if (div) div.innerHTML = ButtonName()
        div = document.getElementById("wallet_logout")
        if (div) div.style.display = account ? 'inline-block' : 'none'
      }
      else return false
    })
  }

  const handleSyncUnsync = (e) => {
    e.preventDefault()
    if (account) return
    syncTaquito().then(() => {
      let div = document.getElementById("wallet_connector")
      if (div) div.innerHTML = ButtonName()
      if (account?.address) {
        div = document.getElementById("wallet_logout")
        if (div) div.style.display = 'inline-block'
      }
    })
  }

  const handleDisconnect = (e) => {
    e.preventDefault()
    if (account) {
      // disconnect wallet
      disconnect().then(() => {
        let div = document.getElementById("wallet_connector")
        if (div) div.innerHTML = ButtonName()
        div = document.getElementById("wallet_logout")
        if (div) div.style.display = 'none'
      })
    }
  }

  return (
    <div className="wallet">
      <a href="#" id='wallet_connector' onClick={e => handleSyncUnsync(e)} className='button'>{ButtonName()}</a>
      <a href="#" id='wallet_logout'
        onClick={e => handleDisconnect(e)}
        className='button small'
        style={{ display: account ? 'inline-block' : 'none' }}
      >
        <FontAwesomeIcon icon='sign-out-alt' />
      </a>
    </div>
  )
}

// query contracts
const queryContracts = `
query MyQuery($list: [String!]) {
  fa2(where: {path: {_in: $list}}) {
    path
    contract
  }
}
`

export async function fetchGraphQL(operationsDoc, operationName, variables) {
  let url = 'https://data.objkt.com/v1/graphql'
  const json = JSON.stringify({
    query: operationsDoc,
    variables: variables,
    operationName: operationName
  })
  const response = await axios.post(url, json, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.data)
    .catch(err => {
      return { errors: err }
    });
  return response
}

var mappings = {}
async function getContracts(list) {
  let list_fa2 = list.filter(e => !mappings[e])
  if (empty(list_fa2)) return mappings
  const { errors, data } = await fetchGraphQL(queryContracts, 'MyQuery', { list: list })
  for (let fa2 of data.fa2) {
    mappings[fa2.path] = fa2.contract
  }
  return mappings
}

// utilities
export function empty(val) {
  if (typeof (val) == 'undefined') return true;
  else if (val == null) return true;
  else if (val.constructor == Array && val.length === 0) return true;
  else if (val.constructor == Object && Object.keys(val).length === 0) return true;
  else if (String(val).trim().length == 0) return true;
  else if (val == 'undefined' || val == 'null') return true;

  return false;
}

export function shorten_wallet(tz, max) {
  try {
    if (empty(tz)) return '';
    if (tz.match(/^(tz|kt)/im)) return tz.slice(0, 5) + ".." + tz.slice(-5);
    else return tz.slice(0, empty(max) ? 20 : max);
  } catch (e) {
    console.log("short wallet error", tz, e)
    return tz;
  }
}

export async function urlsToTokens(content) {
  let list = content.split(/[\s+]/ig).filter(e => !empty(e))
  let tokens = {}

  for (let url of list) {
    let item = { fa2: null, id: null, amount: 1 }
    let m = url.match(/objkt\.com\/asset\/([^\/]+)\/([^\/\?&]+)/i)
    if (m && m.length > 0) {
      item.id = m[2]
      if (m[1] == 'hicetnunc') item.fa2 = OBJKT_CONTRACT
      else item.fa2 = m[1]
    }
    else {
      item.id = url.split('/').pop()
      if (item.id.match(/^[0-9]+$/)) item.fa2 = OBJKT_CONTRACT
      else continue // invalid HEN token
    }

    let uuid = `${item.fa2}_${item.id}`
    if (empty(tokens[uuid])) tokens[uuid] = item
    else tokens[uuid].amount += 1
  }

  // retrieve collections contracts
  let results = Object.values(tokens)
  let collections = results.map(e => e.fa2).filter(e => !e.match(/^KT.{34}$/))
  await getContracts(collections)
  for (let entry of results) {
    if (mappings[entry.fa2]) entry.fa2 = mappings[entry.fa2]
  }
  return results
}

// generic wallet part
export function initWallet() {
  if (empty(Tezos)) {
    Tezos = new TezosToolkit(DEFAULT_NODE)
    Tezos.setProvider({ config: { confirmationPollingIntervalSecond: 5, confirmationPollingTimeoutSecond: 66 } })
    wallet = null
  }
  if (wallet) return;
  wallet = new BeaconWallet({
    name: BEACON_NAME,
    preferredNetwork: 'mainnet',
  })
  Tezos.setWalletProvider(wallet)
}

export async function setAccount() {
  initWallet()
  if (empty(account)) account =
    Tezos !== undefined
      ? await wallet.client.getActiveAccount()
      : undefined

  return account
}

export async function connectedWalletAddress() {
  await setAccount()
  if (empty(account)) return null
  else return account.address
}

export async function syncTaquito() {
  initWallet()
  const network = {
    type: 'mainnet',
    rpcUrl: DEFAULT_NODE,
  }

  // We check the storage and only do a permission request if we don't have an active account yet
  // This piece of code should be called on startup to "load" the current address from the user
  // If the activeAccount is present, no "permission request" is required again, unless the user "disconnects" first.
  const activeAccount = await wallet.client.getActiveAccount()
  if (activeAccount === undefined) {
    console.log('permissions')
    await wallet.requestPermissions({ network })
  }
  account = await wallet.client.getActiveAccount()
  console.log(`connected to ${DEFAULT_NODE}`, account.address)
}

export async function disconnect() {
  initWallet()

  console.log('disconnect wallet')
  // This will clear the active account and the next "syncTaquito" will trigger a new sync
  await wallet.client.clearActiveAccount()
  account = undefined
}

function writeMessage(msg, style) {
  document.querySelectorAll("#tx_infos .blink").forEach(e => e.remove())
  let div = document.getElementById("tx_infos")
  if (div) {
    let content = document.createElement('span')
    ReactDOM.render(
      <span dangerouslySetInnerHTML={{ __html: msg }} />
      , content)
    div.append(content)
    if (!empty(style)) div.classList.add(style)
  }
}

function removeInfo(evt) {
  if (evt) evt.preventDefault()
  let div = document.getElementById("tx_infos")
  if (div) div.remove()
}


export async function processTransaction(method, data) {
  initWallet()
  let div = document.getElementById("tx_infos")
  if (!empty(div)) div.remove()

  div = document.createElement("div")
  div.id = 'tx_infos'
  ReactDOM.render(
    <>
      <a href="#" onClick={e => removeInfo(e)} className='right'>Close</a>
      Sending transaction to your wallet.<br />
      <span className='blink' >... Waiting for your confirmation ...<br /></span>
    </>
    , div
  )
  document.getElementById("processing").insertAdjacentElement("afterend", div)
  window.scrollTo(0, 0);

  let batchOp = await method(data)
  if (!batchOp) {
    writeMessage("Operation cancelled<br/>", 'error')
    return false;
  }
  else if (!empty(batchOp.message) && empty(batchOp.opHash)) {
    writeMessage(`${batchOp.message}<br/>`, 'error')
    return false;
  }
  let tx_link = empty(batchOp.opHash) ? '' : `Transaction infos : <a href="https://tzkt.io/${batchOp.opHash}" target="_blank">${batchOp.opHash}</a><br/>`
  if (typeof (buylog) != 'undefined') buylog(`Transaction infos: ${batchOp.opHash}`)
  writeMessage(`Transaction sent to the blockchain.<br/>${tx_link}<span class='blink'>Stand by ... Waiting for transaction status ...<br/></span>`)

  try {
    let result = await batchOp.confirmation();
    if (result.completed) {
      let op_status = await batchOp.status()
      if (op_status === "applied") {
        writeMessage('... SUCCESS ...', 'success')
      } else {
        writeMessage(`!!! ERROR : ${op_status} !!! VERIFY with above link !!!`, 'error')
      }
      return batchOp.opHash
    }
    else {
      writeMessage(`!!! Transaction failed, double check with above link !!!<br/>${result.message}`, 'error')
      return false
    }
  }
  catch (e) {
    console.error("error while waiting for confirmation")
    console.error(e)
    writeMessage(`!!! Unable to get transaction status, VERIFY with above link !!!<br/>${e.message}`, 'warning')
    return false
  }
}

// barter contract interaction
export async function trade_id_from_hash(hash) {
  let url = `https://api.tzkt.io/v1/operations/${hash}`
  let response = await axios.get(url)
  let content = response.data
  if (empty(content)) return 'Hash not found'
  let data = content.find(op => op.parameter.entrypoint == 'propose_trade')
  if (empty(data)) return 'This hash is not a trade proposal'
  if (data.status != 'applied') return 'This proposal transaction failed, no trade was created'
  let result = parseInt(data.storage?.counter)
  if (result > 0) return result - 1
  else return 'Trade ID not found'
}

export async function query_trade(trade_id) {
  // must return trade infos: trade status and tokens to be exchanged
  let url = `https://api.tzkt.io/v1/bigmaps/${BIGMAP_ID}/keys/${trade_id}`
  let response = await axios.get(url)
  let content = response.data
  if (!empty(content)) {
    let result = content.value
    result.trade_id = parseInt(content.key)
    return result
  }
  else return false
}

export async function active_trades(wallet) {
  let url = "https://api.tzkt.io/v1/bigmaps/51052/keys?limit=1000&active=True&value.cancelled=false&value.executed=false"
  if (!empty(wallet)) url += `&value.user1=${wallet}` // active trade for a wallet
  else url += `&value.user2=null` // all active open trades
  let response = await axios.get(url)
  let data = response.data
  return data.map(e => {
    let item = e.value
    item.trade_id = parseInt(e.key)
    return item
  })
}

export async function propose_trade(data) {
  initWallet()

  let tokens = data.tokens1
  let for_tokens = data.tokens2
  let with_user = empty(data.user2) ? null : data.user2

  let storage_limit = (tokens.length + 1) * 150

  // build add/remove operator op lists
  let add_op = []
  let remove_op = []
  let markets = {}

  // retrieve all contracts
  for (let t of tokens) {
    if (empty(markets[t.fa2])) markets[t.fa2] = await Tezos.wallet.at(t.fa2)
  }

  // memoize add & remove operators that we need to do
  for (let t of tokens) {
    let op = markets[t.fa2]
    add_op.push({
      kind: OpKind.TRANSACTION,
      ...op.methods.update_operators([{ add_operator: { operator: NFT4NFT, token_id: t.id, owner: data.user1 } }])
        .toTransferParams({ amount: 0, mutez: true, storageLimit: 75 })
    })
    remove_op.push({
      kind: OpKind.TRANSACTION,
      ...op.methods.update_operators([{ remove_operator: { operator: NFT4NFT, token_id: t.id, owner: data.user1 } }])
        .toTransferParams({ amount: 0, mutez: true, storageLimit: 75 })
    })
  }

  // build final transaction
  let nft = await Tezos.wallet.at(NFT4NFT)
  let list = []
  list = list.concat(add_op)
  list.push({
    kind: OpKind.TRANSACTION,
    ...nft.methods.propose_trade(tokens, for_tokens, with_user)
      .toTransferParams({ amount: 0, mutez: true, storageLimit: storage_limit })
  })
  list = list.concat(remove_op)

  console.log('propose_trade', list)
  let batch = await Tezos.wallet.batch(list);
  return await batch.send().catch((e) => e)
}

export async function accept_trade(data) {
  initWallet()

  let trade_id = parseInt(data.trade_id)
  let tokens = data.tokens2
  let storage_limit = (tokens.length + 1) * 150

  // build add/remove operator op lists
  let add_op = []
  let remove_op = []
  let markets = {}

  // retrieve all contracts
  for (let t of tokens) {
    if (empty(markets[t.fa2])) markets[t.fa2] = await Tezos.wallet.at(t.fa2)
  }

  // memoize add & remove operators that we need to do
  for (let t of tokens) {
    let op = markets[t.fa2]
    add_op.push({
      kind: OpKind.TRANSACTION,
      ...op.methods.update_operators([{ add_operator: { operator: NFT4NFT, token_id: t.id, owner: account.address } }])
        .toTransferParams({ amount: 0, mutez: true, storageLimit: 75 })
    })
    remove_op.push({
      kind: OpKind.TRANSACTION,
      ...op.methods.update_operators([{ remove_operator: { operator: NFT4NFT, token_id: t.id, owner: account.address } }])
        .toTransferParams({ amount: 0, mutez: true, storageLimit: 75 })
    })
  }

  // build final transaction
  let nft = await Tezos.wallet.at(NFT4NFT)
  let list = []
  list = list.concat(add_op)
  list.push({
    kind: OpKind.TRANSACTION,
    ...nft.methods.accept_trade(trade_id)
      .toTransferParams({ amount: 0, mutez: true, storageLimit: storage_limit })
  })
  list = list.concat(remove_op)

  console.log('accept_trade', list)
  let batch = await Tezos.wallet.batch(list);
  return await batch.send().catch((e) => e)
}

export async function cancel_trade(trade_id) {
  initWallet()

  let params = {
    amount: 0,
    mutez: true,
    storageLimit: 150,
  }

  let swap_id = parseInt(trade_id)
  return await Tezos.wallet.at(NFT4NFT)
    .then((c) =>
      c.methods
        .cancel_trade(trade_id)
        .send(params)
    )
    .catch((e) => e)
}