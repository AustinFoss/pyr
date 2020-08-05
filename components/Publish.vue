<template>
    <v-row>
        <v-col>  
            <h3>Publish Work</h3>
            <v-form class="publishForm">
                <v-text-field 
                    required
                    label="Title"
                    v-model="content.title"
                />
                <v-text-field 
                    required
                    label="Content to Publish (file path)"
                    v-model="content.file"
                />
                <v-text-field 
                    type="number"
                    min="0" 
                    max="999999" 
                    required
                    label="Price in ETH"
                    v-model="content.price"
                />
                <v-btn small outlined color="green" @click="publish(content)">Publish</v-btn>
            </v-form>
        </v-col>
    </v-row>    
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
    data: () => ({
        content: {
            title: '',
            file: '',
            price: 0,
            transactionCut: 0
        }
    }),
    computed: {
        ...mapState('fleek',[
            'client'
        ])
    },
    methods: {
        ...mapActions('fleek',[
            'publish'
        ])
    },
}
</script>

<style>
    .publishForm {margin: 5%;}
</style>