<template>
  <v-layout row wrap>
    <v-flex >
      <v-row v-if="p2pNode != null">
        <v-col>Peers: {{ p2pNode.registrar.connectionManager.connections.size }}</v-col>
      </v-row>
      <v-row v-else>Loading</v-row>
    </v-flex>
  </v-layout>
</template>

<script>
import { mapActions, mapState } from 'vuex'
export default {
    computed: {
      ...mapState('libp2p', [
        'p2pNode'
      ])
    },
    created() {
    }      
    
}
</script>

<style>

</style>