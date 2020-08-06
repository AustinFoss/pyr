<template>

  <v-row>
    <v-col><v-btn small outlined color="orange" to="/publisher">Publisher</v-btn></v-col>
    <v-spacer/>
    <v-col><v-btn small outlined color="orange" to="/collector">Collector</v-btn></v-col>
  </v-row>
 
</template>

<script>
import { mapActions, mapState } from 'vuex'
export default {
    computed: {
      ...mapState('libp2p', [
      ]),
    },
}
</script>

<style>

</style>