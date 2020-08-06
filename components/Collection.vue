<template>
    <v-col>
        <h3>Personal Collection</h3>
        <v-layout row wrap>
            <v-flex xs12 sm6 md4 lg4 v-for="content in collectedContent" :key="collectedContent.indexOf(content)">
                <v-card max-width="344" class="ma-3" color = "grey darken-3">
                    <MyCopy v-bind:content="content"/> 
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                            small 
                            outlined 
                            color="orange" 
                            @click="signMessage(content)"
                        >Download</v-btn>                        
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
            'collectedContent'
        ])
    },
    methods: {
        ...mapActions('web3', [
            'signMessage',
        ])
    }
}
</script>

<style>

</style>