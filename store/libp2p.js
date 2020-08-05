import Libp2p from 'libp2p'
import Websockets from 'libp2p-websockets'
import WebRTCStar from 'libp2p-webrtc-star'
import { NOISE } from 'libp2p-noise'
import Secio from 'libp2p-secio'
import Mplex from 'libp2p-mplex'
import Boostrap from 'libp2p-bootstrap'
import Gossipsub from 'libp2p-gossipsub';
import pipe from 'it-pipe'
import concat from 'it-concat'

export default {
    state: () => ({
        p2pNode: null,
        subscriptions: new Map()
    }),
    mutations: {
        syncNode: (state, _libp2p) => {
            state.p2pNode = null;
            state.p2pNode = _libp2p;
        },
        subscribedContent: (state, sub) => {
            state.subscriptions.set(sub.subTo, {
                subscription: sub.subscription,
                hasContent: sub.hasContent
            })
            console.log(state.subscriptions);
        }
    },
    actions: {
        initLibP2P: async ({ commit, dispatch }) => {
            const libp2p = await Libp2p.create({
            addresses: {
                listen: [
                '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
                '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
                ]
            },
            modules: {
                transport: [Websockets, WebRTCStar],
                connEncryption: [NOISE, Secio],
                streamMuxer: [Mplex],
                peerDiscovery: [Boostrap],
                pubsub: Gossipsub
            },
            config: {
                peerDiscovery: {
                bootstrap: {
                    enabled: true,
                    list: [
                    '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
                    '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
                    '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
                    '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
                    '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
                    '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64'
                    ]
                }
                }
            }
            })
            console.log(libp2p);
            commit('syncNode', libp2p)
            
            libp2p.handle('/sharedBucket', async ({ stream }) => {
                const result = await pipe(
                  stream,
                  concat
                )
                console.log('got response');
                dispatch('fleek/joinBucket', JSON.parse(result.toString()), {root: true})
              })

            // Listen for new peers
            libp2p.on('peer:discovery', (peerId) => {
                commit('syncNode', libp2p)
                // console.log(`Found peer ${peerId.toB58String()}`)
            })
    
            // Listen for new connections to peers
            libp2p.connectionManager.on('peer:connect', (connection) => {
                commit('syncNode', libp2p)
                libp2p.pubsub.publish("onlineCheckIn1", Buffer.from('LibP2P Node Checking In!'))
                // console.log(`Connected to ${connection.remotePeer.toB58String()}`)
            })
    
            // Listen for peers disconnecting
            libp2p.connectionManager.on('peer:disconnect', (connection) => {
                commit('syncNode', libp2p)           
                // console.log(`Disconnected from ${connection.remotePeer.toB58String()}`)
            })

            await libp2p.start()

        },
        subscribeToContent: async ({state, dispatch, commit}, subscribedContent) => {
            for(let i = 0; i < subscribedContent.length; i++) {
                const subscription = await state.p2pNode.pubsub
                .subscribe(subscribedContent[i], (msg) => {
                    if(msg.from != state.p2pNode.peerId.toB58String()) {
                        console.log('got message');
                        const received = JSON.parse(msg.data.toString())
                        const verifyThis = {
                            contentID: received.contentID,
                            sig: received.signature,
                            block: received.block,
                            requester: msg.from
                        }
                        dispatch('web3/verify', verifyThis, {root: true});
                    }
                })
                const sub = {
                    subTo: subscribedContent[i],
                    subscription: subscription,
                    hasContent: false 
                }
                commit('subscribedContent', sub)
            }
        },
        requestContentKey: ({state}, content) => {
            state.p2pNode.pubsub.publish(content.contentID, Buffer.from(JSON.stringify(content)))
        },
        sendSharedBucket: async ({state}, content) => {
            const { stream } = await state.p2pNode.dialProtocol(
                '/p2p/'+content.requester,
                '/sharedBucket'
            );
            console.log('sending bucket');
            await pipe(
              [content.package],
              stream
            )
        },
    }
}