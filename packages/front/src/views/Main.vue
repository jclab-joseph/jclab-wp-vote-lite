<template>
  <v-content>
    <div class="entry-container">
      <v-btn
        v-for="(item, index) in authorizedScopes"
        :key="'item-' + index"
        :to="scopeNames[item].link"
        class="entry-button"
      >
        {{ $t(`${scopeNames[item].name}.entry.name`) }}
      </v-btn>
      <div v-if="authorizedScopes.length <= 0">
        <router-link to="/login">LOGIN</router-link>
      </div>
    </div>
  </v-content>
</template>
<style scoped>
.entry-container {
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
}

::v-deep .entry-button {
  height: auto !important;
  width: 100%;
  padding: 3em !important;
  margin: 1em;
}
</style>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

interface ScopeInfo {
  name: string;
  link: string;
}

@Component({})
export default class Main extends Vue {
  public scopeNames: Record<string, ScopeInfo> = {
    'jclab-wp-lite.vote/manager': {
      name: 'manager',
      link: '/mgr'
    },
    'jclab-wp-lite.vote/viewer': {
      name: 'viewer',
      link: '/view'
    },
    'jclab-wp-lite.vote/voter': {
      name: 'voter',
      link: '/voter'
    },
  };

  public get authorizedScopes (): string[] {
    return this.$store.state.authorizedScopes;
  }
}
</script>
