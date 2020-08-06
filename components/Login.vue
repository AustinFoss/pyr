<template>
  <div>
    <v-btn small outlined v-if="isMetaMaskProvided==true" color="green" @click="initEth()">Connect MetaMask</v-btn>
    <v-btn small outlined v-else color="green" :href="'https://metamask.io/download.html'" target="_blank">Please Install MetaMask</v-btn>    
  </div>
</template>

<script>
import { mapMutations, mapActions, mapState } from 'vuex'
export default {
  computed: {
    ...mapState('web3',[
      'isMetaMaskProvided'
    ])
  },
  methods: {
    ...mapActions('web3',[
      'initEth'
    ])
  }
}
</script>

<style>

</style>