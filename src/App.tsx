import React from 'react';
import logo from './logo.svg';
import './App.css';
import {ethers} from 'ethers'
import { sequence } from '0xsequence'
import { SequenceIndexerClient } from '@0xsequence/indexer'
import Modal from 'react-modal';

const customStyles = {
  content: {
    color: 'white',
    top: '40%',
    left: '40%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    background: 'black',
  },
};

const Address = (props: any) => {
  return(
    <>
      <br/>
      <span className="tx">→ to {props.address.slice(0,6)+'...'}</span>
      <br/>
    </>
  )
}

const Transaction = (props: any) => {
  return(
    <>
      <br/>
      <span className="tx">{props.contractType}</span>&nbsp;&nbsp;<span className="tx">{props.transferType}</span> <span className="tx">{props.tokenId} from {props.from.slice(0,6)}... → to {props.to.slice(0,6)}...</span>
      <br/>
    </>
  )
}

const NFT = (props: any) => {
  return(<>
  <div className={`nft-row animate__animated ${props.fade ? 'animate__fadeInRight' : 'animate__fadeInLeft' }`}>
    <div className={`nft-card`}>
      <img width={100}src={props.image} />
        <br/>
        {props.name}
        <br/>
        {"x"+props.quantity}
    </div>
  </div>
  </>)
}

function convertToCSV(objArray: any) {
  var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
  var str = '';

  for (var i = 0; i < array.length; i++) {
      var line = '';
      for (var index in array[i]) {
          if (line != '') line += ','

          line += array[i][index];
      }

      str += line + '\r\n';
  }

  return str;
}

function exportCSVFile(headers: any, items: any, fileTitle: any) {
  if (headers) {
      items.unshift(headers);
  }

  console.log(items)
  // Convert Object to JSON
  var jsonObject = JSON.stringify(items);

  var csv = convertToCSV(jsonObject);

  var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement("a");
  if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportedFilenmae);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
}

const Explorer = () => {

  const [isSearching, setIsSearching] = React.useState<any>(false)
  const [loading, setLoading] = React.useState<any>(false)
  const [NFTs, setNFTs] = React.useState<any>([])
  const [transactions, setTransactions] = React.useState<any>()
  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [listName, setListName] = React.useState('');
  const [cidList, setCidList] = React.useState<any>([])
  const [addresses, setAddresses] = React.useState<any>([])
  const [searchQuery, setSearchQuery] = React.useState<any>()
  const [quickView, setQuickView] = React.useState(false)
  const [indexerSignal, setIndexerSignal] = React.useState<any>(null)

  // csv file 
  const [fileTitle, setFileTitle] = React.useState<any>(null)
  const [headers, setHeaders] = React.useState<any>(null)

  // search type
  const [contractSearch, setContractSearch] = React.useState<any>('search-activated')
  const [walletSearch, setWalletSearch] = React.useState<any>(null)

  // networks
  const [mainnetNetwork, setMainnetNetwork] = React.useState<any>(null)
  const [polygonNetwork, setPolygonNetwork] = React.useState<any>(null)
  const [mumbaiNetwork, setMumbaiNetwork] = React.useState<any>('magenta')

  async function getNFTs(address: any) {
    try {

      let accountAddress = address.target.value

      const nfts: any = []

      const balances = await indexerSignal.getTokenBalances({
        accountAddress: accountAddress,
        includeMetadata: true
      })

      console.log(balances)
      
      balances.balances.map((nft: any) => {
        if((nft.contractType == 'ERC1155' || nft.contractType == 'ERC721') && nft.tokenMetadata && nft.tokenMetadata.image){
          nfts.push({ 
            image: nft.tokenMetadata.image, 
            name: nft.tokenMetadata.name, 
            contractAddress: nft.contractAddress, 
            quantity: nft.balance
          })
        }
      })

      return {success: true, NFTs: nfts}
    } catch(e){
      console.log(e)
      return {success: false, error: e, NFTs: []}
    }
  }

  async function getHistory(address: any) {

    try {
      const history = await indexerSignal.getTransactionHistory({
        filter: {contractAddress: address.target.value},
      })
  
      console.log('token history of contract:', history)

      let txs: any = []

      history.transactions.map((tx: any) => {
        console.log(tx)
        tx.transfers.map((transfer: any) => {
          transfer.tokenIds.map((tokenId: any) => {
            console.log(tokenId)
            txs.push({
              transferType: transfer.transferType,
              from: transfer.from,
              to: transfer.to,
              contractType: transfer.contractType,
              tokenId: tokenId
            })
          })
        })
      })
  
      return {success: true, txs: txs}
    }catch(e){
      return {success: false, error: e, txs: []}
    }

  }

  const onChangeInput = async (text: any) => {
    setLoading(true)
    setQuickView(false)
    setSearchQuery(text.target.value)

    setTimeout(async () => {
      setIsSearching(true)
      setFileTitle(text.target.value + "")

      if(contractSearch != 'search-activated'){

        const nfts = await getNFTs(text)
        const nftsComponents = []
        
        for(let i = 0; i < nfts.NFTs.length; i++){
          if(nfts.NFTs[i].description != '')
            nftsComponents.push(<NFT fade={i % 2 == 0} image={nfts.NFTs[i].image} name={nfts.NFTs[i].name} contractAddress={nfts.NFTs[i].contractAddress} quantity={nfts.NFTs[i].quantity}/>)
        }
      
        setNFTs(nftsComponents)
      } else {
        const txComponents = []
        const txRaw = []

        const txs = await getHistory(text)
        console.log(txs)

        setHeaders({
          transferType: "Transfer Type",
          to: "To",
          from: "From",
          contractType: "Contract Type",
          tokenId: "Token Id"
        })

        for (let i = 0; i < txs.txs.length; i++) {
          txComponents.push(<Transaction transferType={txs.txs[i].transferType} to={txs.txs[i].to} from={txs.txs[i].from} contractType={txs.txs[i].contractType} tokenId={txs.txs[i].tokenId}/>)
          txRaw.push({
            transferType: txs.txs[i].transferType,
            to: txs.txs[i].to,
            from: txs.txs[i].from,
            contractType: txs.txs[i].contractType,
            tokenId: txs.txs[i].tokenId
          })
        }
        setNFTs(txComponents)
        setTransactions(txRaw)
      }

      setLoading(false)
    }, 2000)
  }

  const searchType = (search: any) => {
    setContractSearch(null)
    setWalletSearch(null)
    if(search == 'contract') setContractSearch('search-activated')
    else setWalletSearch('search-activated')
  }

  const networkType = (network: any) => {
    setPolygonNetwork(null)
    setMainnetNetwork(null)
    setMumbaiNetwork(null)

    if(network == 'mainnet') setMainnetNetwork('magenta')
    else if (network == 'polygon') setPolygonNetwork('magenta')
    else if (network == 'mumbai') setMumbaiNetwork('magenta')
  }

  const saveList = (transactions: any) => {
    const toList = new Map()
    transactions.map((tx: any) => {
        toList.set(tx.to, true)
    })

    setAddresses(Array.from(toList.keys()))
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  const onChangeInputModal = (evt: any) => {
    setListName(evt.target.value)
  }

  const acceptModalEntry = () => {

    // make a localstorage update
    if(localStorage.getItem('nonce:list')=== null) localStorage.setItem('nonce:list', String(1))
    else localStorage.setItem('nonce:list', String(Number(localStorage.getItem('nonce:list'))+1))
    
    // write to localstorage
    localStorage.setItem(`list:${localStorage.getItem('nonce:list')}`, JSON.stringify({name: listName, list: addresses}))

    // write storage event
    window.dispatchEvent(new Event("storage"))
    setIsOpen(false);

  }

  const repopulate = (id: any) => {
    const txComponents: any = []
    const list = JSON.parse(localStorage.getItem(`list:${id}`)!)

    for(let i = 0; i< list.list.length; i++) {
      txComponents.push(<Address address={list.list[i]} />)
    }
    setNFTs(txComponents)
    setQuickView(true)
    setSearchQuery('')
  } 

  React.useEffect(() => {

    if(mainnetNetwork == 'magenta'){
      console.log('connecting to mainnet')
      setIndexerSignal(new SequenceIndexerClient('https://mainnet-indexer-v2.sequence.app'))
      sequence.initWallet('mainnet')
    } else if(polygonNetwork == 'magenta'){
      console.log('connecting to polygon')
      setIndexerSignal(new SequenceIndexerClient('https://polygon-indexer-v2.sequence.app'))
      sequence.initWallet('polygon')
    } else if(mumbaiNetwork == 'magenta'){
      console.log('connecting to mumbai')
      setIndexerSignal(new SequenceIndexerClient('https://mumbai-indexer-v2.sequence.app'))
      sequence.initWallet('mumbai')
    }

    setTimeout(() => {
      window.dispatchEvent(new Event("storage"))
    }, 1000)

    const listener = () => {

      // get cid counter nonce
      const nonceList = localStorage.getItem("nonce:list") ? localStorage.getItem("nonce:list")! : 0

        const listNames: any = []
        console.log(nonceList)
        for(let i = 0; i < nonceList; i++){
          listNames.push(<li style={{cursor: 'pointer', margin: '10px', color: 'white'}} onClick={() => repopulate(i+1)}>{JSON.parse(localStorage.getItem(`list:${i+1}`)!).name}</li>)
        }

        // set cids
        setCidList(listNames);
    };
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("storage", listener);
    };
  }, [mainnetNetwork, polygonNetwork, mumbaiNetwork]);

  return (
    <div>
      <span className='address-list'>saved address lists</span>
      <hr style={{width: '20%'}}/>
      <nav>
          <ul>
              {cidList}
          </ul>
        </nav>
      <hr style={{width: '20%'}}/>
      <span className={`search-type ${contractSearch}`} onClick={() => {setSearchQuery('');setQuickView(false);setNFTs([]);searchType('contract')}}>contract</span><span className={`search-type ${walletSearch}`} onClick={() => {setSearchQuery('');setQuickView(false);setNFTs([]);searchType('wallet')}} >wallet</span>
      <br/>
      <br/>
      <input className="search" value={searchQuery} onInput={onChangeInput} placeholder="0x..."></input>
      <br/>
      <br/>
    
      <span className={`network ${mainnetNetwork}`} onClick={() => {networkType('mainnet')}}>mainnet</span><span className={`network ${polygonNetwork}`} onClick={() => networkType('polygon')}>polygon</span><span className={`network ${mumbaiNetwork}`} onClick={() => networkType('mumbai')}>mumbai</span>
      <br/>
      <Modal
        isOpen={modalIsOpen}
        // onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Example Modal"
      >
        <h2>Give your list a name</h2>
        <input placeholder='list name' onChange={onChangeInputModal}/>
        &nbsp;&nbsp;&nbsp;
        <button onClick={() => acceptModalEntry()} className='export'>save list</button> 
      </Modal>
      <br/>
      {
        NFTs.length > 0 
        ? <>
            <span className='tx'>displaying {NFTs.length}&nbsp;</span> 
            <br/><br/>
            {
              contractSearch == 'search-activated' && !quickView
              ? 
                <>
                  <button onClick={() => exportCSVFile(headers, transactions, fileTitle)} className='export'>export to CSV</button> 
                  &nbsp;&nbsp;&nbsp;
                  <button onClick={() => saveList(transactions)} className='export'>save 'to' list</button> 
                </>
                : null 
            }
          </>
        : null
      }
      <br/>
      {
        loading ? <p className={'loading'}>loading ... </p> : NFTs.length > 0 ?  NFTs : isSearching ? <p className={'loading'}>No NFTs</p> : null
      } 
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <br/>
      <br/>
      <br/>
      <img className="center" src="https://sequence.xyz/sequence-wordmark.svg" />
      <br/>
      <br/>
      <br/>
      <br/>
      <span className={`nav nav-active`}>explorer</span>
      <Explorer/>
    </div>
  );
}

export default App;
