import { SpaceClient } from '@fleekhq/space-client';

export default {
    // strict: false,
    state: () => ({
        collectorPageSwitch: false,
        publisherPageSwitch: false,
        client: null,
        publishedContent: [],
        collectedContent: [],
        collectableContent: [],
        resaleTokens: [],
        loadingContent: new Map()
    }),
    mutations: {
        initSpaceClient: (state, client) => {
            state.client = client;
        },
        publisherPageSwitchFlip: (state, page) => {
            state.publisherPageSwitch = page;
        },
        collectorPageSwitchFlip: (state, page) => {
            state.collectorPageSwitch = page;
        },
        publishedContent: (state, contentList) => {
            state.publishedContent = contentList; 
            console.log(state.publishedContent);     
        },
        collectableContent: (state, contentList) => {
            state.collectableContent = contentList
        },
        collectContent: (state, contentID) => {
            if(state.collectedContent.includes(contentID) == false) {
                state.collectedContent.push(contentID)
            }
            console.log(state.collectedContent);
        },
        loadingContent: (state, contentID) => {
            state.loadingContent.set(contentID, !state.loadingContent.get(contentID))
        }
    },
    actions: {
        initSpaceClient: ({commit}) => {
            const client = new SpaceClient({
                url: `http://localhost:9998`
            });
            commit('initSpaceClient', client);
        },
        // Assembles a single list from the collected & published content lists
        // Checking for duplicates and then passes that to LibP2P
        subscribedContent: ({state, dispatch}) => {
            let subscribedContent = [];
            for(let i = 0; i < state.publishedContent.length; i++) {
                if(subscribedContent.includes(state.publishedContent[i]) == false) {
                    subscribedContent.push(state.publishedContent[i])
                }
            }
            for(let i = 0; i < state.collectedContent.length; i++) {
                if(subscribedContent.includes(state.collectedContent[i]) == false) {
                    subscribedContent.push(state.collectedContent[i])
                }
            }
            console.log(state.publishedContent);
            dispatch('libp2p/subscribeToContent', subscribedContent, {root: true});
        },  
        publish: ({ state, dispatch }, content) => {
            console.log(content);
            state.client
            .createBucket({ slug: content.title})
            .then((res) => {
                const stream = state.client.addItems({
                bucket: content.title,
                targetPath: '/', // path in the bucket to be saved
                sourcePaths: [content.file]
                });
            
                stream.on('data', (data) => {
                console.log('data: ', data);
                });
            
                stream.on('error', (error) => {
                console.error('error: ', error);
                });
            
                stream.on('end', () => {
                    state.client
                    .shareBucket({ bucket: content.title })
                    .then((res) => {
                        const bucket = res.getThreadinfo();
                        dispatch('web3/publish', {content, bucket}, { root: true });
                    })
                    .catch((err) => {
                        console.error(err);
                    });
                });
            })
            .catch((err) => {
                if(err.message == "Http response at 400 or 500 level"){
                console.log("Please connect a Space Daemon Instance");
                } else {
                console.error(err);
                }
            });
        },
        getContent: async ({state}, received) => { 
            const bucket = received.bucketName;     
            const dirRes = await state.client.listDirectories({
                bucket,
            });
            const entriesList = dirRes.getEntriesList();

            const openFileRes = await state.client.openFile({
                bucket,
                path: entriesList[0].getPath(),
            });
            const location = openFileRes.getLocation();
            const index = state.collectedContent.findIndex(function(content) {
                return content.tokenId == received.tokenId
            })
            state.collectedContent[index].pathToFile = location
            state.collectedContent[index].loadingContent = false
        },
        shareBucket: ({state, dispatch}, bucket) => {
            state.client.shareBucket({ bucket: bucket.bucket })
            .then((res) => {
                const threadInfo = res.getThreadinfo();
                const sharedBucket = JSON.stringify({
                    key: threadInfo.getKey(),
                    addresses: threadInfo.getAddressesList(),
                    title: bucket.bucket,
                    tokenId: bucket.tokenId
                })
                dispatch('libp2p/sendSharedBucket', {requester: bucket.requester, package: sharedBucket}, {root: true})
            })
            .catch((err) => {
              console.error(err);
            });
        },
        joinBucket: ({state, dispatch}, thread) => {
            state.client
            .joinBucket({
                bucket: thread.title,
                threadInfo: {
                    key: thread.key,
                    addresses: thread.addresses,
                }
            })
            .then((res) => {
                dispatch('getContent', {bucketName: thread.title, tokenId: thread.tokenId})
            })
            .catch((err) => {
                if(err.code == 2) {
                    // bucket already added
                    dispatch('getContent', {bucketName: thread.title, tokenId: thread.tokenId})
                } else {
                    console.error(err);
                }
            });
        },

    }
}