import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Main from '@/views/Main.vue';
import Login from '@/views/Login.vue';
import ManagerHome from '@/views/mgr/ManagerHome.vue';
import ManagerElectionHome from '@/views/mgr/ManagerElectionHome.vue';
import ViewerHome from '@/views/viewer/ViewerHome.vue';
import ViewerView from '@/views/viewer/ViewerView.vue';
import VoterHome from '@/views/voter/VoterHome.vue';
import VoterLogin from '@/views/voter/VoterLogin.vue';
import { RootState, Scope } from '@/store/types';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Main',
    component: Main
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/mgr',
    name: 'ManagerHome',
    component: ManagerHome,
  },
  {
    path: '/mgr/election/:elecId',
    name: 'ManagerElectionHome',
    component: ManagerElectionHome
  },
  {
    path: '/view',
    name: 'ViewerHome',
    component: ViewerHome,
  },
  {
    path: '/view/:viewId',
    name: 'ViewerView',
    component: ViewerView,
  },
  {
    path: '/voter',
    name: 'VoterHome',
    component: VoterHome,
  },
  {
    path: '/voter/login',
    name: 'VoterLogin',
    component: VoterLogin,
  }
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

function waitLoading (state: RootState): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (!state.loading) {
        resolve();
      }
      setTimeout(() => check(), 100);
    };
    check();
  });
}

function checkScope (state: RootState, scope: Scope) {
  return state.authorizedScopes.findIndex((v: Scope) => v === scope) >= 0;
}

router.beforeEach((to, from, next) => {
  router.app.$nextTick(() => {
    waitLoading(router.app.$store.state)
      .then(() => {
        if (to.name?.startsWith('Manager')) {
          router.app.$store.commit('setCurrentContext', 'manager');
        } else if (to.name?.startsWith('Viewer')) {
          router.app.$store.commit('setCurrentContext', 'viewer');
        } else if (to.name?.startsWith('Voter')) {
          router.app.$store.commit('setCurrentContext', 'voter');
        }

        if (
          to.name?.startsWith('Login') ||
          to.name?.startsWith('VoterLogin') ||
          to.name?.startsWith('Main') ||
          to.name?.startsWith('Viewer')
        ) {
          return next();
        }

        if (to.name?.startsWith('Manager')) {
          if (!checkScope(router.app.$store.state, 'jclab-wp-lite.vote/manager')) {
            return next('/login?login_redirect=' + encodeURIComponent(to.fullPath));
          }
        }
        if (to.name?.startsWith('Voter')) {
          if (!checkScope(router.app.$store.state, 'jclab-wp-lite.vote/voter')) {
            return next('/voter/login');
          }
        }
        next();
      })
      .catch((err) => {
        console.error(err);
        alert('ERROR: ' + err);
      });
  });
});

export default router;
