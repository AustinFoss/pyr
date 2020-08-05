<template>
    <v-col>
        <h3>Collectable Works</h3>
        <v-btn outlined small color="green" @click="getCollectables()">Browse Content Library</v-btn>
        <v-layout row wrap>
            <v-flex xs12 sm6 md4 lg4 v-for="collectable in collectableContent" :key="collectableContent.indexOf(collectable)">
                <v-card max-width="344" class="ma-3" color = "grey darken-3">
                    <Content
                        v-if="content.contract.get(collectable.returnValues[1]) != undefined" 
                        v-bind:contentID="collectable.returnValues[1]"
                    />  
                    <p v-else>Loading</p>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                        outlined
                        small
                        color="green"
                        @click="purchase(collectable.returnValues[1])"
                        >
                        Collect
                        </v-btn> 
                    </v-card-actions> 
                </v-card>
            </v-flex>
        </v-layout>
    </v-col>
</template>

<script>
import { mapState, mapActions } from 'vuex'
export default {
    computed: {
        ...mapState('fleek', [
            'collectableContent'
        ]),
        ...mapState('web3', [
            'content'
        ])
    },
    methods: {
        ...mapActions('web3', [
            'getCollectables',
            'purchase'
        ]),
    }
}
</script>

<style>

</style>