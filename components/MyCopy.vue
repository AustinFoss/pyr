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
    props: ['content'],
    computed: {
    },
    methods: {
        
    },
    data: () => ({
      items: [
        {
          color: '#1F7087',
          title: 'Supermodel',
          artist: 'Foster the People',
        },
      ],
    }),
}
</script>

<style>

</style>