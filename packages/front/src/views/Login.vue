<template>
  <v-content>
    LOGIN...
    <a :href="this.redirectUri">로그인 창으로 이동하지 않으면 여기를 누르세요: {{ this.redirectUri }}</a>
  </v-content>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({})
export default class Login extends Vue {
  public redirectUri: string = '';

  public mounted (): void {
    this.redirectUri = this.$store.state.oauth2AuthorizeUri;
    window.location.href = this.redirectUri;
  }
}
</script>
