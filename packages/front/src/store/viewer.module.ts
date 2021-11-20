import {
  Module
} from 'vuex';
import { RootState, ViewerState } from '@/store/types';

const viewerModule: Module<ViewerState, RootState> = {
  namespaced: true,
  state: {
    electionTitle: ''
  },
  mutations: {},
  getters: {},
  actions: {},
};

export default viewerModule;
