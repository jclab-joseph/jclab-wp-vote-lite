import {
  Module
} from 'vuex';
import { RootState, ManagerState } from '@/store/types';

const managerModule: Module<ManagerState, RootState> = {
  namespaced: true,
  state: {
    electionTitle: ''
  },
  mutations: {},
  getters: {},
  actions: {},
};

export default managerModule;
