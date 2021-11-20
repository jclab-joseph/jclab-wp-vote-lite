<template>
  <v-content>
    <v-container fluid fill-height>
      <v-layout align-center justify-center>
        <v-flex xs12 sm8 md4>
          <v-card class="elevation-12">
            <v-toolbar dark color="primary">
              <v-toolbar-title>{{$t('voter.login.title')}}</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-form>
                <v-text-field
                  v-model="voterCode"
                  prepend-icon="fas fa-user"
                  label="Voter Code"
                  type="text"
                ></v-text-field>
                <v-text-field
                  v-model="passphrase"
                  prepend-icon="fas fa-lock"
                  label="Password"
                  type="password"
                ></v-text-field>
              </v-form>
            </v-card-text>
            <v-card-text v-if="errorMessage" style="color: red">
              {{errorMessage}}
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" v-on:click="login" :loading="loading" :disabled="loading">{{$t('voter.login.login_button')}}</v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>
  </v-content>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { AxiosError } from 'axios';

@Component({})
export default class VoterLogin extends Vue {
  public voterCode: string = '';
  public passphrase: string = '';

  public errorMessage: string = '';
  public loading: boolean = false;

  public mounted (): void {
    this.voterCode = ((this.$route.query.v || this.$route.query.id) as (string | undefined)) || '';
    this.passphrase = ((this.$route.query.p || this.$route.query.pw) as (string | undefined)) || '';

    if (this.voterCode && this.passphrase) {
      this.login();
    }
  }

  public login (): void {
    this.loading = true;
    this.$appsvc.httpClient.post(
      '/api/voter/login',
      {
        voter_code: this.voterCode,
        passphrase: this.passphrase
      },
      {
        withCredentials: true,
        appNoErrorHandling: true
      }
    )
      .then((response) => {
        this.errorMessage = '';
        this.$store.dispatch('configReload')
          .then(() => {
            this.$router.push('/voter');
          });
      })
      .catch((err: AxiosError) => {
        console.error(err);
        console.error({ ...err });
        if (err.response?.status === 401) {
          this.errorMessage = this.$t('voter.login.error_wrong_creds') as string;
        } else {
          this.errorMessage = this.$t('error.please_retry') + '\n' + (err?.response?.data?.message || err);
        }
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
</script>
