import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom'
import Head from 'next/head'

import {
  empty, query_trade, urlsToTokens, connectedWalletAddress, processTransaction,
  accept_trade, cancel_trade, propose_trade, NFT4NFT, WalletConnector,
} from '../utils/nft.js'

export default function PageContent() {
  const [cancelInfos, setCancelInfos] = useState(false)
  const [acceptInfos, setAcceptInfos] = useState(false)
  const [proposeInfos, setProposeInfos] = useState(false)

  useEffect(() => {
    ReactDOM.render(<WalletConnector />, document.getElementById("wallet_connector_container"))
  }, []);

  const isConnected = async () => {
    let wallet = connectedWalletAddress()
    if (empty(wallet)) {
      alert('you must first connect your wallet')
      return false
    }
    return true
  }

  const getTradeInfos = async (trade_id) => {
    if (empty(trade_id)) return
    let trade = await query_trade(trade_id)
    if (!trade) trade = { error: "Trade not found" }
    trade.invalid = !empty(trade.error) || trade.cancelled || trade.executed
    return trade
  }

  const verifyCancelTrade = async (e) => {
    if (e) e.preventDefault()
    let trade = await getTradeInfos(document.getElementById("cancel_trade_id")?.value)
    setCancelInfos(trade)
  }

  const doCancelTrade = async (e) => {
    if (e) e.preventDefault()
    if (!await isConnected()) return
    if (empty(cancelInfos.trade_id)) return
    await processTransaction(cancel_trade, cancelInfos.trade_id)
  }

  const verifyAcceptTrade = async (e) => {
    if (e) e.preventDefault()
    let trade = await getTradeInfos(document.getElementById("accept_trade_id")?.value)
    setAcceptInfos(trade)
  }

  const doAcceptTrade = async (e) => {
    if (e) e.preventDefault()
    if (!await isConnected()) return
    if (empty(acceptInfos.trade_id)) return
    await processTransaction(accept_trade, acceptInfos)

  }

  const prepareTrade = async (e) => {
    if (e) e.preventDefault()
    if (!await isConnected()) return

    let trade = {
      user1: await connectedWalletAddress(),
      tokens1: urlsToTokens(document.getElementById("send_tokens").value),
      tokens2: urlsToTokens(document.getElementById("accept_tokens").value),
    }

    if (empty(trade.tokens1)) trade = { invalid: true, error: 'You must propose some tokens to trade' }
    else if (empty(trade.tokens2)) trade = { invalid: true, error: 'You must ask for some tokens in exchage of yours' }
    else {
      let wallet = document.getElementById("with_user").value
      if (!empty(wallet)) trade.user2 = wallet
    }
    setProposeInfos(trade)
  }

  const doProposeTrade = async (e) => {
    if (e) e.preventDefault()
    if (!await isConnected()) return

    let trade = proposeInfos
    await processTransaction(propose_trade, trade)
  }

  const ShowError = ({ data }) => {
    return (
      <>
        {
          data.error && (
            <span className='error'>{data.error}</span>
          )
        }
        {
          data.executed && (
            <span className='error'>Trade {data.trade_id} as already been accepted by {data.user2}</span>
          )
        }
        {
          data.cancelled && (
            <span className='error'>Trade {data.trade_id} as already been cancelled by {data.user1}</span>
          )
        }
      </>
    )
  }

  const ShowTrade = ({ data }) => {
    return (
      <div className='block'>
        <b>{data.user1} want to trade :</b><br />
        <ul>
          {data.tokens1.map((token, index) => (
            <li key={index}>
              {token.amount} x <a href={`https://objkt.com/asset/${token.fa2}/${token.id}`} target="_blank">{token.fa2}#{token.id}</a>
            </li>
          )
          )}
        </ul>
        <br />

        <b>For :</b><br />
        <ul>
          {data.tokens2.map((token, index) => (
            <li key={index}>
              {token.amount} x <a href={`https://objkt.com/asset/${token.fa2}/${token.id}`} target="_blank">{token.fa2}#{token.id}</a>
            </li>
          )
          )}
        </ul>
        <br />

        <b>With : </b> {empty(data.user2) ? 'anybody' : data.user2}
      </div >
    )
  }

  return (
    <>
      <Head>
        <title>NFT 4 NFT</title>
      </Head>
      <div id="input">
        <h2>NFT 4 NFT</h2>
        <p>
          This tool allow you to interact with the barter contract written by <a href="https://twitter.com/jagracar">Javier Graciá Carpio</a>. Contract source code is available <a href="https://github.com/jagracar/tezos-smart-contracts/blob/main/python/contracts/simpleBarterContract.py">on github</a> and you can interact with the contract on <a href={`https://better-call.dev/mainnet/${NFT4NFT}/interact`}>better-call.dev</a>
        </p>

        <div id="processing"></div>

        <h3>Propose a trade</h3>
        <div>
          Enter the list of tokens url (HEN or OBJKT) that you offer to trade, one per line:<br />
          <textarea id="send_tokens" style={{ width: '100%', height: '50px', margin: '10px 0px' }}></textarea>
        </div>

        <div>
          Enter the list of tokens url (HEN or OBJKT) that you want to receive, one per line:<br />
          <textarea id="accept_tokens" style={{ width: '100%', height: '50px', margin: '10px 0px' }}></textarea>
        </div>

        <div className='block'>
          If this is a negociated trade, enter the wallet address (in tz... format) of the person with whom you want to do this trade, otherwise leave this empty for anyone to accept this trade<br />
          <input id='with_user' placeholder='tz...' style={{
            width: '100%',
            margin: '10px 0px'
          }}></input>
        </div>
        <div className='block'>
          <a href="#" onClick={prepareTrade} className="button">PREPARE TRADE</a>
        </div>

        {proposeInfos && (
          <div className='block'>
            {proposeInfos.invalid ? (
              <ShowError data={proposeInfos} />
            ) : (
              <>
                <ShowTrade data={proposeInfos} />
                <a href="#" onClick={doProposeTrade} className="button">SEND TRADE</a>
              </>
            )}
          </div>
        )}


        <h3>Accept a trade</h3>
        <div className='block'>
          If someone gave you a TRADE ID that you want to accept, make sure that you own the requested token(s) and that they are not currently swapped. Just enter the TRADE ID, and execute the trade. The contract will send your token(s) to the person who proposed the trade, and you will receive the token(s) proposed, which are already stored in the contract.
        </div>
        <div className='block'>
          <input type="text" id="accept_trade_id" style={{ width: '25%' }} placeholder="Trade ID"></input>
          <a href="#" onClick={verifyAcceptTrade} className="button">CHECK</a>
        </div>
        {acceptInfos && (
          <div className='block'>
            {acceptInfos.invalid ? (
              <ShowError data={acceptInfos} />
            ) : (
              <>
                <ShowTrade data={acceptInfos} />
                <a href="#" onClick={doAcceptTrade} className="button">ACCEPT TRADE</a>
              </>
            )}
          </div>
        )}

        <h3>Cancel a trade</h3>
        <div className='block'>
          At any time, you can cancel a trade proposal as long as you have the TRADE ID and you are the one who created the trade proposal.
        </div>
        <div className='block'>
          <input type="text" id="cancel_trade_id" style={{ width: '25%' }} placeholder="Trade ID"></input>
          <a href="#" onClick={verifyCancelTrade} className="button">CHECK</a>
        </div>
        {cancelInfos && (
          <div className='block'>
            {cancelInfos.invalid ? (
              <ShowError data={cancelInfos} />
            ) : (
              <>
                <ShowTrade data={cancelInfos} />
                <a href="#" onClick={doCancelTrade} className="button">CANCEL</a>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}