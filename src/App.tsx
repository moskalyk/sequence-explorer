import React from 'react';
import logo from './logo.svg';
import './App.css';
import {ethers} from 'ethers'
import { sequence } from '0xsequence'
import { SequenceIndexerClient } from '@0xsequence/indexer'
// import Modal from 'react-modal';

import { 
  SearchInput,
  RadioGroup,
  GradientAvatar,
  Tabs, 
  Scroll,
  Text, 
  TextInput,
  Button, 
  Box, 
  IconButton, 
  SunIcon, 
  Modal,
  Placeholder,
  useTheme } from '@0xsequence/design-system'

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
      <Box justifyContent='center' alignItems='center'>
        <Text variant="medium">→ to </Text><GradientAvatar style={{margin: '10px'}} address={props.address}/> <Text variant="medium">{props.address.slice(0,6)+'...'}</Text>
      </Box>
    </>
  )
}

const Transaction = (props: any) => {
  return(
    <>
      <Box justifyContent='center' alignItems='center'>
        <Text>{props.contractType} {props.tokenId} from </Text><GradientAvatar style={{margin: '10px'}} address={props.from}/><Text>{props.from.slice(0,6)}... → to </Text><GradientAvatar style={{margin: '10px'}} address={props.to}/><Text>{props.to.slice(0,6)}...</Text>
      </Box>
      {/* <span className="tx">{props.contractType}</span>&nbsp;&nbsp;<span className="tx">{props.transferType}</span> <span className="tx">{props.tokenId} from {props.from.slice(0,6)}... → to {props.to.slice(0,6)}...</span> */}
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

const fullIndexerPagination = async (indexer: any, address: string) => {
  const txs: any = []
  // const indexer = new SequenceIndexerClient('https://mumbai-indexer.sequence.app')

  // here we query the Joy contract address, but you can use any
  const contractAddress = address;

  const filter = {
      contractAddress: contractAddress,
  };

  // query Sequence Indexer for all token transaction history on Mumbai
  let txHistory = await indexer.getTransactionHistory({
      filter: filter,
      page: { pageSize: 10 }
  })

  
  txs.push(...txHistory.transactions)

  // if there are more transactions to log, proceed to paginate
  while(txHistory.page.more){  
      txHistory = await indexer.getTransactionHistory({
          filter: filter,
          page: { 
              pageSize: 10, 
              // use the after cursor from the previous indexer call
              after: txHistory!.page!.after! 
          }
      })
      txs.push(...txHistory.transactions)
  }

  return txs
}

const fullIndexerBalancePagination = async (indexer: any, address: string) => {
  const txs: any = []
  // const indexer = new SequenceIndexerClient('https://mumbai-indexer.sequence.app')

  // here we query the Joy contract address, but you can use any
  const contractAddress = address;

  // const filter = {
  //     contractAddress: contractAddress,
  // };

  // query Sequence Indexer for all token transaction history on Mumbai

  let txHistory = await indexer.getTokenBalances({
      accountAddress: address,
      includeMetadata: true
  })

  // let txHistory = await indexer.getTransactionHistory({
  //     filter: filter,
  //     page: { pageSize: 10 }
  // })

  txs.push(...txHistory.balances)

  // if there are more transactions to log, proceed to paginate
  while(txHistory.page.more){  
      txHistory = await indexer.getTokenBalances({
          accountAddress: address,
          includeMetadata: true,
          page: { 
              pageSize: 10, 
              // use the after cursor from the previous indexer call
              after: txHistory!.page!.after! 
          }
      })
      txs.push(...txHistory.balances)
  }

  return txs
}

const TransactionHistory = (props: any) => {
  const {theme, setTheme} = useTheme()

  async function getHistory(address: any) {

    try {
      const txsRes = await fullIndexerPagination(props.indexer, address.target.value)

      console.log('token history of contract:', txsRes)

      let txs: any = []

      txsRes.map((tx: any) => {
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
    props.searchType('contract')
    props.setLoading(true)
    props.setQuickView(false)
    props.setSearchQuery(text.target.value)

    setTimeout(async () => {
      props.setIsSearching(true)
      props.setFileTitle(text.target.value + "")

      const txComponents = []
      const txRaw = []

      const txs = await getHistory(text)
      console.log(txs)

      props.setHeaders({
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
      props.setNFTs(txComponents)
      props.setTransactions(txRaw)
      props.setLoading(false)
    }, 2000)
  }

  return(<>
  <br/>
    <Box justifyContent={'center'} width="full">
      <SearchInput style={{border: 'none', color: theme == 'dark'? 'white' : 'black'}} label="" labelLocation="top" onChange={(evt: any) => onChangeInput(evt)}/>
    </Box>
  </>)
}

const Collections = (props: any) => {
  const {theme, setTheme} = useTheme()

  async function getNFTs(address: any) {
    try {

      let accountAddress = address.target.value

      const nfts: any = []
      const balances = await fullIndexerBalancePagination(props.indexer, accountAddress)

      console.log(balances)

      balances.map((nft: any) => {
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

  const onChangeInput = async (text: any) => {
    props.searchType('wallet')
    props.setLoading(true)
    props.setQuickView(false)
    props.setSearchQuery(text.target.value)

    setTimeout(async () => {
      props.setIsSearching(true)
      props.setFileTitle(text.target.value + "")

      const nfts = await getNFTs(text)
        const nftsComponents = []
        
        for(let i = 0; i < nfts.NFTs.length; i++){
          if(nfts.NFTs[i].description != '')
            nftsComponents.push(<NFT fade={i % 2 == 0} image={nfts.NFTs[i].image} name={nfts.NFTs[i].name} contractAddress={nfts.NFTs[i].contractAddress} quantity={nfts.NFTs[i].quantity}/>)
        }
      
      props.setNFTs(nftsComponents)
      props.setLoading(false)
    }, 2000)
  }

  return(<>
  <br/>
    <Box justifyContent={'center'} width="full">
      <SearchInput style={{border: 'none', color: theme == 'dark'? 'white' : 'black'}} label="" labelLocation="top" onChange={(e: any) => onChangeInput(e)}/>
    </Box>
  </>)
}

const Explorer = () => {
  const {theme, setTheme} = useTheme()

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
  const [network, setNetwork] = React.useState('polygon')
  const [mainnetNetwork, setMainnetNetwork] = React.useState<any>(null)
  const [polygonNetwork, setPolygonNetwork] = React.useState<any>(null)
  const [mumbaiNetwork, setMumbaiNetwork] = React.useState<any>('magenta')

  const searchType = (search: any) => {
    setContractSearch(null)
    setWalletSearch(null)
    if(search == 'contract') setContractSearch('search-activated')
    else setWalletSearch('search-activated')
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

    if(network == 'mainnet'){
      console.log('connecting to mainnet')
      setIndexerSignal(new SequenceIndexerClient('https://mainnet-indexer.sequence.app'))
      sequence.initWallet('mainnet')
    } else if(network == 'polygon'){
      console.log('connecting to polygon')
      setIndexerSignal(new SequenceIndexerClient('https://polygon-indexer.sequence.app'))
      sequence.initWallet('polygon')
    } else if(network == 'mumbai'){
      console.log('connecting to mumbai')
      setIndexerSignal(new SequenceIndexerClient('https://mumbai-indexer.sequence.app'))
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
          listNames.push(<li key={i} style={{cursor: 'pointer', margin: '10px'}} onClick={() => repopulate(i+1)}><Text>{JSON.parse(localStorage.getItem(`list:${i+1}`)!).name}</Text></li>)
        }

        // set cids
        setCidList(listNames);
    };
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("storage", listener);
    };
  }, [network]);

  return (
    <div>
      <Text>saved address lists</Text>
      <br/>
      <br/>
      <Box style={{marginLeft: '80px'}}>
        <nav>
          <ul>
              {cidList}
          </ul>
        </nav>
      </Box>
      <br/>
      <Box justifyContent='center'>
        <RadioGroup size='lg' gap='10' flexDirection="row" value={network} onValueChange={(value) => setNetwork(value)}name="network" options={[{'label': "mainnet", value: 'mainnet'},{'label': "polygon", value: 'polygon'},{'label': "mumbai", value: 'mumbai'},]}/>
      </Box>
      <br/>
      <Box justifyContent='center'>
        <Tabs onValueChange={(value) => setNFTs([])} style={{width: '400px'}} defaultValue='txhistory' tabs={[
          {
            value: 'txhistory',
            label: 'NFT Transaction History',
            content: <TransactionHistory 
                        indexer={indexerSignal} 
                        setSearchQuery={setSearchQuery} 
                        setNFTs={setNFTs} 
                        setQuickView={setQuickView}
                        setLoading={setLoading}
                        setIsSearching={setIsSearching}
                        setFileTitle={setFileTitle}
                        setHeaders={setHeaders}
                        setTransactions={setTransactions}
                        searchType={searchType}
                      />,
          },
          {
            value: 'collections',
            label: 'Collections',
            content: <Collections 
                        indexer={indexerSignal} 
                        setSearchQuery={setSearchQuery} 
                        setNFTs={setNFTs} 
                        setQuickView={setQuickView}
                        setLoading={setLoading}
                        setIsSearching={setIsSearching}
                        setFileTitle={setFileTitle}
                        setHeaders={setHeaders}
                        setTransactions={setTransactions}
                        searchType={searchType}
                      />,
          }]}
        />
      </Box>
      <br/>
      {
        modalIsOpen 
        ? 
          <Modal size='sm'> 
            <Box style={{margin: '20px'}}>
              <h2>Give your list a name</h2>
              <TextInput  placeholder='list name' onChange={onChangeInputModal}/>
              &nbsp;&nbsp;&nbsp;
              <button onClick={() => acceptModalEntry()} className='export'>save list</button> 
            </Box>
          </Modal>
        :
          null
      }
      {/* <Modal
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
      </Modal> */}
      {
        NFTs.length > 0 
        ? <>
            <Text>displaying {NFTs.length}&nbsp;</Text>
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
      <br/>

      {
        loading ? <Box justifyContent={'center'}><Box flexDirection="column" gap="2"><Placeholder size="md" /><br/><Placeholder size="md" /></Box></Box> : NFTs.length > 0 ?  NFTs : isSearching ? <Text>Nothing to show</Text> : null
      } 
    </div>
  );
};

function App() {

  const {theme, setTheme} = useTheme()

  return (
    <div className="App">
      <Box gap='6'>
        <IconButton style={{position: 'fixed', top: '20px', right: '20px'}} icon={SunIcon} onClick={() => {
          setTheme(theme == 'dark' ? 'light' : 'dark')
        }}/>
      </Box>
      <br/>
      <br/>
      { 
        theme == 'dark' 
        ? 
          <img className="center" src="https://docs.sequence.xyz/img/icons/sequence-composite-dark.svg" />
        :
          <img className='center' src="https://docs.sequence.xyz/img/icons/sequence-composite-light.svg"/> 
      }
      <br/>
      <br/>
      <Text variant="large">explorer</Text>
      <br/>
      <br/>
      <Explorer/>
    </div>
  )
}

export default App;
