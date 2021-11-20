import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import ko from 'vuetify/src/locale/ko';

Vue.use(Vuetify);

export default new Vuetify({
  lang: {
    locales: { ko },
    current: 'ko'
  },
  icons: {
    iconfont: 'fa'
  }
});
