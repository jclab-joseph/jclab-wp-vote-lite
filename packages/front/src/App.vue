<template>
  <v-app>
    <v-app-bar
      app
      color="deep-purple accent-4"
      dense
      dark
    >
      <v-btn icon to="/" style="margin-right: 2em">
        <v-icon>fas fa-home</v-icon>
      </v-btn>
      <v-btn icon v-on:click="goBack">
        <v-icon>fas fa-arrow-left</v-icon>
      </v-btn>
<!--      <v-app-bar-nav-icon></v-app-bar-nav-icon>-->

      <v-toolbar-title>{{title}}</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn v-if="isLoggedIn" icon v-on:click="logout" style="margin-right: 1em">
        <v-icon>fas fa-sign-out-alt</v-icon>
        LOGOUT
      </v-btn>
    </v-app-bar>
    <v-main>
      <div v-if="$store.state.loading">
        LOADING...
        {{ loadingError }}
      </div>
      <router-view v-else></router-view>
    </v-main>
    <v-footer app>
    </v-footer>
  </v-app>
</template>
<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
<script lang="ts">
import {
  Component,
  Vue, Watch,
} from 'vue-property-decorator';
import { ElectionItem } from '@/wrappers';

@Component({
  components: {
  },
})
export default class App extends Vue {
  public loadingError: null | Error = null;

  public created (): void {
    if (this.$store.state.loading) {
      this.$store.dispatch('configReload')
        .then(() => {
          this.loadingError = null;
        })
        .catch((err) => {
          this.loadingError = err;
        });
    }
  }

  public get currentContext (): string {
    return this.$store.state.currentContext;
  }

  public get isLoggedIn (): boolean {
    return this.$store.state.isLoggedIn;
  }

  public get currentElection (): ElectionItem | null {
    return this.$store.state.currentElection;
  }

  public get title (): string {
    if (this.currentElection) {
      return this.currentElection.title;
    }
    return '';
  }

  public goBack (): void {
    this.$router.back();
  }

  public logout (): void {
    this.$appsvc.logout();
  }

  public get loading (): boolean {
    return this.$store.state.loading;
  }

  // @Watch('loading')
  // public onLoadingChanged () {
  //   if (this.loading) {
  //     this.onChangeLoginStatus();
  //   }
  // }

  @Watch('isLoggedIn')
  public onChangeLoginStatus (): void {
    console.log('isLoggedIn: ', this.isLoggedIn);
    this.$appsvc.feedChangeLoginStatus();
  }
}
</script>
