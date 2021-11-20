import {
  Module
} from 'vuex';
import { RootState, VoterState } from '@/store/types';

const voterModule: Module<VoterState, RootState> = {
  namespaced: true,
  state: {
    electionTitle: ''
  },
  mutations: {},
  getters: {},
  actions: {},
};

export default voterModule;
