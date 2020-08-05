import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import Pyr from '../build/contracts/Pyr.json';
import Content from '../build/contracts/Content.json';

export default {
    state: () => ({
        isMetaMaskProvided: Boolean, // Checks if MetaMask is installed
        currentAccount: null, // Current connected MetaMask Account
        web3: null, // Web3 instance after MetaMask provider is passed
        pyr: { // Pyr contract
            abi: Pyr.abi,
            address: Pyr.networks[5777].address,
            contract: null
        },
        content: { // Content ERC-721 NFT contracts
            abi: Content.abi,
            addresses: [],
            contract: new Map(),
        }
    }),
    mutations: {
        // Sets the web3 instance given a MetaMask provider
        setWeb3: (state, provider) => {
            state.web3 = provider;
        },
        // Sets the primary Pyr contract instance
        setContract: (state) => {
            state.pyr.contract = new state.web3.eth.Contract(state.pyr.abi, state.pyr.address);
        },
        // Sets Bool variable telling user to install MetaMask
        fetchedProvider: (state, isMetaMask) => {
            state.isMetaMaskProvided = isMetaMask
        },
        // Sets currentAccount to the MetaMask connected account
        updateAccount: (state, account) => {
            state.currentAccount = account
        },
        // Accepts a Content Contract Address, checks for duplicates, & inits a new contract instance
        addContentID: (state, address) => {
            if(state.content.addresses.includes(address) == false) {
                state.content.addresses.push(address);
                state.content.contract.set(address, new state.web3.eth.Contract(state.content.abi, address))
            }
        }
    },
    actions: {
        // Runs all logic to check for MetaMask provider and connect an account
        fetchProvider: ({state, dispatch, commit}) => {
            detectEthereumProvider().then(res => {
                commit('fetchedProvider', res.isMetaMask)   
                if(res.isMetaMask==true) { 
                    const provider = new Web3(res);
                    commit('setWeb3', provider);
                    commit('setContract')
                    dispatch('getAccount')        
                } 
            });
        },
        // Connect account address from MetaMask
        getAccount: async ({commit, dispatch}) => {
            const accounts = await ethereum.enable()
            commit('updateAccount', accounts[0])
            // Generate content lists from contracts for the given MetaMask account
            dispatch('myPublishedContent')
            dispatch('myCollection')
        },
        // Get the list of my published content 
        myPublishedContent: ({state, commit, dispatch}) => {
            // 1. Gets array of all contract address published by connected account
            state.pyr.contract.methods
            .getCreatorLibrary(state.currentAccount)
            .call({from: state.currentAccount})
            .then(res=> {
                // 2. Pushes contentID to the publishedContent list
                commit('fleek/publishedContent', res, {root: true})
                // Updates subscription list
                dispatch('fleek/subscribedContent', {}, {root: true}) 
                for(let i = 0; i < res.length; i ++) {
                    // Inits a contract instance mapped to the contentID
                    commit('addContentID', res[i])
                }
            })
        },
        // Get the list of my collected content
        myCollection: ({state, commit, dispatch}) => {
            // 1. First get list of all published content contracts
            state.pyr.contract.getPastEvents('ContentPublished', {
                fromBlock: 0,
                toBlock: 'latest'
            }).then(events => {
                // 2. Check for a `balanceOf` > 0 for each contract given the connected account
                for(let i = 0; i < events.length; i++) {
                    const contentID = events[i].returnValues[1]; // Content Contract Address
                    const checkContract = new state.web3.eth.Contract(state.content.abi, contentID) // Content Contract
                    checkContract.methods.balanceOf(state.currentAccount)
                    .call({from: state.currentAccount})
                    .then(balance => {
                        if(balance > 0) {
                            // Inits a contract instance mapped to the contentID
                            commit('addContentID', contentID);
                            // Pushes contentID to the collectedContent list
                            commit('fleek/collectContent', contentID, {root: true})
                            // Updates subscription list
                        }
                    })
                }
                dispatch('fleek/subscribedContent', {}, {root: true})
            }).catch(err => {console.log(err);})        
        },
        // Call the Publish function in the Pyr Contract   
        publish: async ({state, dispatch}, toPublish) => {
            const bucketAddresses = toPublish.bucket.getAddressesList();
            await state.pyr.contract.methods.newContent(
                toPublish.content.title, // Content Title & Bucket Name
                state.web3.utils.toWei(toPublish.content.price, 'ether'), // Price per token in Wei
                bucketAddresses[0].slice(-116) // Thread & Encrypted Bucket Info
            ).send({ from: state.currentAccount, gas : 6000000 })
            .on('ContentPublished', (event) => {
                console.log(event)
            }).then((receipt) => {
                console.log(receipt)
                dispatch('myPublishedContent')
            }).catch(err => console.log(err))
        },
        // _safeMint's a new token
        purchase: async ({state, dispatch},contentID) => {
            const contentContract = state.content.contract.get(contentID)
            // Call content metadata to get the price value to send
            contentContract.methods.getContentData().call({from: state.currentAccount})
            .then(contentData => {
                const price = contentData[1];
                contentContract.methods.purchase()
                .send({ from: state.currentAccount, gas: 6000000, value: price })
                .on('transactionHash', (hash) => {
                    console.log(hash)
                })
                .then(receipt => {
                    // Update list of published content
                    dispatch('myPublishedContent')
                }).catch(err => {console.log(err);})
            })
        },
        // Called when browsing list of collectable content
        // TODO: Add search filter parameters, for new returns all content contracts
        getCollectables: async ({state, commit}) => {
            await state.pyr.contract.getPastEvents('ContentPublished', {
                fromBlock: 0,
                toBlock: 'latest'
            }).then(events => {
                commit('fleek/collectableContent', events, {root: true})
                for(let i = 0; i < events.length; i++) {
                    commit('addContentID', events[i].returnValues[1])
                }
            }).catch(err => {console.log(err);})
        },
        // The first step in retrieving content after purchase
        signMessage: ({state, dispatch, commit}, signThis) => {
            // 1. Get hash of latest block to sign
            state.web3.eth.getBlock("latest")
            .then(block => {
                state.web3.eth.personal.sign(block.hash, state.currentAccount)
                .then(sig => {
                    // 2. Package content to send in message
                    const content = {
                        contentID: signThis,
                        signature: sig,
                        block: block.number,
                    }
                    // 3. Send message to request content key
                    dispatch('libp2p/requestContentKey', content, {root: true})        
                });
            });            
        },
        // Verify content in received message
        verify: async ({state, dispatch}, verifyThis) => {
            // 1. get latest block number
            state.web3.eth.getBlock("latest")
            .then(block => {
                // 2. If the signature is newer than 20blocks, ~5min, else ignore request
                if(block.number - verifyThis.block <= 20) {
                    // 3. get block of number that was signed
                    state.web3.eth.getBlock(verifyThis.block)
                    .then(signedBlock => {
                        // 4. Recover account from signature & the signedBlock's hash
                        state.web3.eth.personal.ecRecover(
                            signedBlock.hash, 
                            verifyThis.sig
                        ).then(from => {
                            // 5. Check if recovered account address has a balance with the content's contract
                            const contentContract = state.content.contract.get(verifyThis.contentID)
                            contentContract.methods.balanceOf(from)
                            .call({from: state.currentAccount})
                            .then(count => {
                                if(count > 0) {
                                    contentContract.methods.getContentData()
                                    .call({from: state.currentAccount})
                                    .then(contentData => {
                                        // 6. Now get the bucket info to share 
                                        dispatch('fleek/shareBucket', {bucket: contentData, requester: verifyThis.requester, contentID: verifyThis.contentID}, {root: true});    
                                    })
                                }
                            })
                            .catch((err) => {
                                console.error(err);
                            });                   
                        })
                    })
                } else {
                    console.log('Message to old.');
                }
            })            
        }
    }
}