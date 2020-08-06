import { SpaceClient } from '@fleekhq/space-client';

export default {
    state: () => ({
        collectorPageSwitch: false,
        publisherPageSwitch: false,
        client: null, // Space Client connected to Space Daemon
        publishedContent: [],
        collectedContent: [],
        collectedContentData: [], // Metadata pbjects of collected content (maping is convenient but seems non-reactive in UI)
        collectableContent: [],
    }),
    mutations: {
        // Sets Space Daemon's Space Client
        initSpaceClient: (state, client) => {
            state.client = client;
        },
        // Controls Publisher Page switch
        publisherPageSwitchFlip: (state, page) => {
            state.publisherPageSwitch = page;
        },
        // Controls Collector Page switch
        collectorPageSwitchFlip: (state, page) => {
            state.collectorPageSwitch = page;
        },
        // Sets list of your Published Content
        publishedContent: (state, contentList) => {
            state.publishedContent = contentList; 
        },
        // Sets browsable list of Collactable Content for purchase
        collectableContent: (state, contentList) => {
            state.collectableContent = contentList
        },
        // Pushes contentID(Content Contract Address), checking for duplicates
        collectContent: (state, contentID) => {
            if(state.collectedContent.includes(contentID) == false) {
                state.collectedContent.push(contentID)
                state.collectedContentData.push({contentID: contentID, loading: false, location: ''})
            }
        },
        loadingContent: (state, contentID) => {
            const index = state.collectedContentData.findIndex(function(item) {
                return item.contentID == contentID
            })  
            state.collectedContentData[index].loading = true;      
        }
    },
    actions: {
        // Initializes new SpaceClient
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
            // 1. For all published contentID's check if it needs to be pushed to subscribed content list
            for(let i = 0; i < state.publishedContent.length; i++) {
                if(subscribedContent.includes(state.publishedContent[i]) == false) {
                    subscribedContent.push(state.publishedContent[i])
                }
            }
            // 2. For all collected contentID's check if it needs to be pushed to subscribed content list
            for(let i = 0; i < state.collectedContent.length; i++) {
                if(subscribedContent.includes(state.collectedContent[i]) == false) {
                    subscribedContent.push(state.collectedContent[i])
                }
            }
            // 3. Send list to LibP2P node
            dispatch('libp2p/subscribeToContent', subscribedContent, {root: true});
        },
        // Creates unique bucket for content to be published
        publish: ({ state, dispatch }, content) => {
            // 1. Create Bucket 
            state.client
            .createBucket({ slug: content.title})
            .then(() => {
                // 2. Add content to bucket
                const stream = state.client.addItems({
                    bucket: content.title, // Name of bucket to add content
                    targetPath: '/', // Path in the bucket to be saved
                    sourcePaths: [content.file] // File Path of content to publish
                });
            
                stream.on('data', (data) => {
                    console.log('data: ', data);
                });
            
                stream.on('error', (error) => {
                    console.error('error: ', error);
                });
                // 3. Once content is added, get share bucket info
                stream.on('end', () => {
                    state.client
                    .shareBucket({ bucket: content.title })
                    .then((res) => {
                        const bucket = res.getThreadinfo();
                        // 4. Pass info to be sent to the Pyr newContent function
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
        // This share bucket function is only called after receiving a verified content request message
        shareBucket: ({state, dispatch}, content) => {
            state.client.shareBucket({ bucket: content.bucket[0] })
            .then((res) => {
                const threadInfo = res.getThreadinfo();
                // All necessary info to be included with the response
                const sharedBucket = JSON.stringify({
                    key: threadInfo.getKey(),
                    addresses: threadInfo.getAddressesList(),
                    content: content.bucket,
                    contentID: content.contentID
                })
                // Pass to LibP2P to be sent
                dispatch('libp2p/sendSharedBucket', {requester: content.requester, package: sharedBucket}, {root: true})
            })
            .catch((err) => {
              console.error(err);
            });
        },
        // Joins requested bucket from the returned information
        joinBucket: ({state, dispatch}, thread) => {
            console.log('joining bucket');            
            // 1. Join bucket
            state.client
            .joinBucket({
                bucket: thread.content[0], // Bucket name
                threadInfo: {
                    key: thread.key, // Key
                    addresses: thread.addresses, // Content providing peer addresses
                }
            })
            .then((res) => {
                // 2. Download Content to local machine
                dispatch('getContent', thread)
            })
            .catch((err) => {
                if(err.code == 2) {
                    // bucket already added
                    dispatch('getContent', thread)
                } else {
                    console.error(err);
                }
            });
        },
        // Downloads content to local machine returning the file path location
        getContent: async ({state}, content) => { 
            console.log('getting content');
            const bucket = content.content[0] // Bucket Name
            const dirRes = await state.client.listDirectories({
                bucket,
            });
            console.log(dirRes);
            const entriesList = dirRes.getEntriesList();
            console.log(entriesList);
            const openFileRes = await state.client.openFile({
                bucket,
                path: entriesList[0].getPath(),
            });
            console.log(openFileRes);
            const location = openFileRes.getLocation();
            const index = state.collectedContentData.findIndex(function(item) {
                return item.contentID == content.contentID
            })
            // Update the file location and sets the loading content variable to false
            state.collectedContentData[index].location = location
            state.collectedContentData[index].loading = false
        },
    }
}