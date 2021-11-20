import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';
import appsvc from './plugins/appsvc';
import 'roboto-fontface/css/roboto/roboto-fontface.css';
import '@fortawesome/fontawesome-free/css/all.css';
import i18n from './i18n';

Vue.config.productionTip = false;

const app = new Vue({
  router,
  store,
  vuetify,
  i18n,
  appsvc,
  render: h => h(App)
});
appsvc.attach(app);

app.$mount('#app');
