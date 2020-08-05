import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import Vue from 'vue';
import Pyr from '../build/contracts/Pyr.json';
import Content from '../build/contracts/Content.json';
var sigUtil = require('eth-sig-util')
import ethUtil from 'ethereumjs-util'

export default {
    state: () => ({
        isMetaMaskProvided: Boolean,
        currentAccount: null,
        web3: null,
        pyr: {
            abi: Pyr.abi,
            address: Pyr.networks[5777].address,
            contract: null
        },
        content: {
            abi: Content.abi,
            addresses: [],
            contract: new Map(),
        }
    }),
    mutations: {
        setWeb3: (state, provider) => {
            state.web3 = provider;
            console.log(state.web3);
        },
        setContract: (state, contract) => {
            state.pyr.contract = contract;
        },
        fetchedProvider: (state, isMetaMask) => {
            state.isMetaMaskProvided = isMetaMask
        },
        updateAccount: (state, account) => {
            state.currentAccount = account
        },
        addContentID: (state, address) => {
            if(state.content.addresses.includes(address) == false) {
                state.content.addresses.push(address);
                state.content.contract.set(address, new state.web3.eth.Contract(state.content.abi, address))
            }
        }
    },
    actions: {
        fetchProvider: ({state, dispatch, commit}) => {
            detectEthereumProvider().then(res => {
                commit('fetchedProvider', res.isMetaMask)   
                if(res.isMetaMask==true) { 
                    const provider = new Web3(res);
                    commit('setWeb3', provider);
                    const contract = new state.web3.eth.Contract(state.pyr.abi, state.pyr.address);
                    commit('setContract', contract)
                    dispatch('initEth')
                } 
            });
        },
        initEth: async({commit, dispatch}) => {
            if (window.ethereum) {        
                dispatch('getAccount')
            } else {
              // Non-dapp browsers…
              console.log('Please install MetaMask');
            }
        },
        //getting authorized account address from MetaMask
        getAccount: async ({commit, dispatch}) => {
            const accounts = await ethereum.enable()
            commit('updateAccount', accounts[0])
            // Generate content lists from contracts
            dispatch('myPublishedContent')
            dispatch('myCollection')
        },        
        publish: async ({state, dispatch}, toPublish) => {
            const bucketAddresses = toPublish.bucket.getAddressesList();
            await state.pyr.contract.methods.newContent(
                toPublish.content.title,
                state.web3.utils.toWei(toPublish.content.price, 'ether'),
                bucketAddresses[0].slice(-116)
            ).send({ from: state.currentAccount, gas : 6000000 })
            .on('ContentPublished', (event) => {
                console.log(event)
            }).then((receipt) => {
                console.log(receipt)
                dispatch('myPublishedContent')
            }).catch(err => console.log(err))
        },
        myPublishedContent: ({state, commit}) => {
            state.pyr.contract.methods
            .getCreatorLibrary(state.currentAccount)
            .call({from: state.currentAccount})
            .then(res=> {
                commit('fleek/publishedContent', res, {root: true})
                for(let i = 0; i < res.length; i ++) {
                    commit('addContentID', res[i])
                }
            })
        },
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
        // _safeMint's a new token
        purchase: async ({state, dispatch},contentID) => {
            //contract call to mint a new token
            const contentContract = state.content.contract.get(contentID)
            contentContract.methods.getContentData().call({from: state.currentAccount})
            .then(contentData => {
                const price = contentData[1];
                contentContract.methods.purchase()
                .send({ from: state.currentAccount, gas: 6000000, value: price })
                .on('transactionHash', (hash) => {
                    console.log(hash)
                })
                .then(receipt => {
                    console.log(receipt);
                    // let tokenId = receipt.events.Transfer.returnValues.tokenId
                    // dispatch('pushMyToken', tokenId)
                }).catch(err => {console.log(err);})
            })
        },
        myCollection: ({state, commit, dispatch}) => {
            state.pyr.contract.getPastEvents('ContentPublished', {
                fromBlock: 0,
                toBlock: 'latest'
            }).then(events => {
                for(let i = 0; i < events.length; i++) {
                    const contentID = events[i].returnValues[1];
                    const checkContract = new state.web3.eth.Contract(state.content.abi, contentID)
                    console.log(checkContract);
                    checkContract.methods.balanceOf(state.currentAccount)
                    .call({from: state.currentAccount})
                    .then(balance => {
                        if(balance > 0) {
                            // Inits a contract instance mapped to the contentID
                            commit('addContentID', contentID);
                            // Pushes contentID to the collectedCOntent list
                            commit('fleek/collectContent', contentID, {root: true})
                        }
                    })
                }
            }).catch(err => {console.log(err);})        
        },
        signMessage: ({state, dispatch, commit}, signThis) => {
            state.web3.eth.getBlock("latest")
            .then(block => {
                state.web3.eth.personal.sign(block.hash, state.currentAccount)
                .then(sig => {
                    const content = {
                        contentID: signThis,
                        signature: sig,
                        block: block.number,
                    }
                    commit('fleek/loadingContent', signThis, {root:true})
                    dispatch('libp2p/requestContentKey', content, {root: true})        
                });
            });            
        },
        verifySig: ({state, dispatch}, verifyThis) => {
            state.web3.eth.getBlock("latest")
            .then(block => {
                // If the signature is greater than 20blocks, ~5min, then ignore
                if(block.number - verifyThis.block <= 20) {
                    state.web3.eth.personal.ecRecover(
                        block.hash, 
                        verifyThis.sig
                    ).then(from => {
                        const verifyOwner = {
                            owner: from,
                            contentID: verifyThis.contentID,
                            requester: verifyThis.requester,
                        }
                        dispatch('verifyOwner', verifyOwner)                                    
                    })
                }
            })            
        },
        verifyOwner: async ({state, dispatch}, verifyOwner) => {
            const contentContract = state.content.contract.get(verifyOwner.contentID)
            await contentContract.methods.balanceOf(verifyOwner.owner)
            .call({from: state.currentAccount})
            .then(count => {
                // Checks if the signing ETH account has a balance with hte NFT contract
                if(count > 0) {
                    console.log("They own the content");
                    // dispatch('fleek/shareBucket', {bucket: details[1], requester: verifyOwner.requester, tokenId: verifyOwner.tokenId}, {root: true});    
                }
            })
            .catch((err) => {
                console.error(err);
            });
        },
    }
}