<template>
    <div>
        <v-list-item>
        <v-list-item-content>
            <v-list-item-title><b>Content ID:</b> {{contentID}}</v-list-item-title>
            <v-list-item><b>Title:</b> {{title}}</v-list-item>
            <v-list-item><b>Price (ETH):</b> {{web3.utils.fromWei(price.toString(), 'ether')}}</v-list-item>
            <v-list-item><b>Content Sales:</b> {{totalSupply}}</v-list-item>
        </v-list-item-content>
        </v-list-item>
    </div>    
</template>

<script>
import { mapState, mapActions } from 'vuex'
export default {
    props: ['contentID'],
    data: () => {
        return {
            contract: null,
            title: "",
            price: 0,
            encryptedBucket: "",
            totalSupply: 0
        }
    },
    computed: {
        ...mapState('web3', [
            'web3',
            'content',
            'currentAccount'
        ]),        
    },
    created() {
        const contract = this.contract = this.content.contract.get(this.contentID);
        contract.methods
        .getContentData()
        .call({from: this.currentAccount})
        .then(contentData => {
            this.title = contentData[0];
            this.price = contentData[1];
            this.encryptedBucket = contentData[2];
        })
        contract.methods
        .totalSupply()
        .call({from: this.currentAccount})
        .then(totalSupply => {
            this.totalSupply = totalSupply
        })
    } 
   
}
</script>

<style>

</style>