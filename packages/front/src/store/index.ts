import Vue from 'vue';
import Vuex from 'vuex';
import { Context, RootState } from './types';
import { Configs, ElectionBase } from '@jclab-wp/vote-lite-common';
import axios from 'axios';
import voterModule from '@/store/voter.module';
import managerModule from '@/store/manager.module';
import viewerModule from '@/store/viewer.module';
import { ElectionItem } from '@/wrappers';
import appsvc from '../plugins/appsvc';

Vue.use(Vuex);

export default new Vuex.Store<RootState>({
  state: {
    loading: true,
    oauth2AuthorizeUri: '',
    oauth2RedirectUri: '',
    oauth2ClientId: '',
    authorizedScopes: [],
    currentContext: '',
    isLoggedIn: false,
    currentElection: null,
    manager: {} as any,
    viewer: {} as any,
    voter: {} as any,
  },
  mutations: {
    setConfigs (state, payload: Configs) {
      state.oauth2ClientId = payload.oauth2ClientId;
      state.oauth2AuthorizeUri = payload.oauth2AuthorizeUri;
      state.oauth2RedirectUri = payload.oauth2RedirectUri;
      state.authorizedScopes = (payload.authorizedScopes as any) || [];
      state.isLoggedIn = (state.authorizedScopes.length > 0);
      state.loading = false;
    },
    setCurrentElection (state, election: ElectionBase | ElectionItem | null) {
      if (!election) {
        state.currentElection = null;
      } else {
        if (election instanceof ElectionItem) {
          state.currentElection = election as any;
        } else {
          state.currentElection = new ElectionItem(election as any);
        }
      }
    },
    setCurrentContext (state, data: Context) {
      const old = state.currentContext as Context;
      state.currentContext = data;
      if (old !== data) {
        appsvc.feedChangeLoginStatus(true);
      }
    }
  },
  actions: {
    configReload (injectee, payload) {
      return axios.get('/api/configs.json', {
        responseType: 'json',
        withCredentials: true
      })
        .then((res) => {
          this.commit('setConfigs', res.data);
        })
        .catch((err) => {
          console.error(err);
          return Promise.reject(err);
        });
    }
  },
  modules: {
    manager: managerModule,
    viewer: viewerModule,
    voter: voterModule,
  }
});
