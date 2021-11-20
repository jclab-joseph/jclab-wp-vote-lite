import Vue from 'vue';
import { AppServiceImpl } from '@/service/appsvc';

Vue.use(AppServiceImpl);
const appsvc = new AppServiceImpl();

export default appsvc;
