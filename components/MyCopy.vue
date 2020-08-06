<template>
<div>
    <v-list-item>
        <v-list-item-content>
          <v-list-item-title><b>Content ID: {{content}}</b></v-list-item-title>
        </v-list-item-content>
    </v-list-item>
</div>
  
</template>

<script>
import { mapActions, mapState } from 'vuex'

export default {
    props: ['content']
}
</script>

<style>

</style>