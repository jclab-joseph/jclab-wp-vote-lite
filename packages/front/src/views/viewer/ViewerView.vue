<template>
  <v-main>
    <v-container v-if="!votes" fluid pa-0>
      Loading...
    </v-container>
    <v-container v-else fluid pa-0>
      <div style="font-size: 0.5em">
        마지막 업데이트 시각 : {{ lastUpdatedTime }}
      </div>
      <div v-if="votes.length <= 0" class="no-votes">
        아직 시작한 투표가 없습니다.
      </div>
      <v-card
        v-for="(vote, voteSeq) in votes" :key="`vote-${voteSeq}`"
        elevation="2"
        outlined
        tile
      >
        <v-card-text style="display: flex; flex-direction: row">
          <div style="width: 50%;">
            <div class="text-h4 text--primary">
              {{ vote.title }}
            </div>
            <div v-if="vote.state === VoteState.ready" class="vote_card__status">
              투표 개시 대기 중 입니다.
            </div>
            <div v-if="vote.state === VoteState.voting" class="vote_card__status">
              투표가 진행중입니다.
              <p>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</p>
              <VoteCandidateList
                :list="vote.candidates"
                type="tile"
              ></VoteCandidateList>
            </div>
            <div v-else-if="vote.state === VoteState.finished" class="vote_card__status">
              <p>투표가 종료되었습니다.</p>
              <p>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</p>
              <VoteCandidateList
                :list="vote.candidates"
                type="tile"
              ></VoteCandidateList>
            </div>
            <div v-else-if="vote.state === VoteState.counting" class="vote_card__status">
              <p>개표 중 입니다.</p>
              <p>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</p>
              <VoteCandidateList
                :list="vote.candidates"
                type="tile"
              ></VoteCandidateList>
            </div>
            <div
              v-else-if="vote.state === VoteState.completed" class="vote_card__status"
            >
              <p>개표 되었습니다.</p>
              <p>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</p>
            </div>
            <!--          <p>{{$t(`voter.vote_state.${vote.state}`)}}</p>-->
            <!--          <div class="text&#45;&#45;primary">-->
            <!--            well meaning and kindly.<br>-->
            <!--            "a benevolent smile"-->
            <!--          </div>-->
            <!--          <v-card-actions>-->
            <!--            <v-btn-->
            <!--              text-->
            <!--              color="deep-purple accent-4"-->
            <!--            >-->
            <!--              Learn More-->
            <!--            </v-btn>-->
            <!--          </v-card-actions>-->
          </div>
          <div style="width: 50%; align-items: stretch;">
            <div v-if="vote.state === VoteState.ready" class="vote_card__status">
              <VoteCandidateList
                :list="vote.candidates"
                type="row"
              ></VoteCandidateList>
            </div>
            <div
              v-else-if="vote.state !== VoteState.completed"
              class="vote_card__button"
            >
              <div>
                <v-progress-circular
                  :rotate="-90"
                  :size="150"
                  :width="30"
                  :value="vote.voterTurnout"
                  color="primary"
                >
                  투표율<br />
                  {{ Math.round(vote.voterTurnout * 10) / 10 }} %
                </v-progress-circular>
              </div>
            </div>
            <VoteResultChart
              v-else
              class="vote_card__button chart"
              :result="vote.result"
            ></VoteResultChart>
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </v-main>
</template>
<style scoped>
.no-votes {
  font-size: 3em;
  text-align: center;
  margin-top: 3em;
}
</style>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { VoteState } from '@jclab-wp/vote-lite-common';
import { ElectionForVoterItem, ElectionItem, VoteForVoterItem, VoteItem } from '@/wrappers';
import VoteResultChart from '@/components/VoteResultChart.vue';
import VoteCandidateList from '@/components/VoteCandidateList.vue';
import { WsCommunicator } from '@/service/appsvc';

@Component({
  components: {
    VoteResultChart,
    VoteCandidateList
  }
})
export default class ViewerView extends Vue {
  public wsc!: WsCommunicator;
  public initialTimer: number = 0;
  public refreshTimer: number = 0;

  public info: ElectionForVoterItem | null = null;
  public lastUpdatedTime: Date | null = null;

  public mounted (): void {
    this.wsc = this.$appsvc.wscAttach(this);
    this.wsc.on('connect', () => {
      if (this.initialTimer) clearInterval(this.initialTimer);
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.initialTimer = setInterval(() => {
        this.wsc.wsEmit('request.election.update');
      }, 1000);
      this.refreshTimer = setInterval(() => {
        if (this.info && this.info.votes) {
          this.wsc.wsEmit(
            'request.votes.update.status',
            this.info.votes
              .filter(v => v.state !== VoteState.completed)
              .map(v => v.voteId)
          );
        }
      }, 1000);
    });
    this.wsc.on('election.update', (election) => {
      if (this.initialTimer) {
        clearInterval(this.initialTimer);
        this.initialTimer = 0;
      }
      const info = new ElectionItem(election);
      this.$set(this, 'info', info);
      this.$set(this, 'lastUpdatedTime', new Date());
      this.$store.commit('setCurrentElection', info);
    });
    this.wsc.on('votes.update.status', (votes) => {
      if (this.info && this.info.votes) {
        const storedVotes = this.info.votes;
        votes.forEach((vote) => {
          const item = storedVotes.find(v => v.voteId === vote.voteId);
          if (item) {
            this.$set(item, 'state', vote.state);
            this.$set(item, 'voterCount', vote.voterCount);
            this.$set(item, 'votedCount', vote.votedCount);
            this.$set(item, 'result', vote.result);
          }
        });
        this.$set(this, 'lastUpdatedTime', new Date());
      }
    });

    this.$appsvc.httpClient.post(
      '/api/view/login',
      {
        id: this.viewId
      }
    )
      .then((response) => {
        this.$nextTick(() => {
          this.$appsvc.startViewerMode();
        });
      });
  }

  public beforeDestroy (): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = 0;
    }
    if (this.initialTimer) {
      clearInterval(this.initialTimer);
      this.initialTimer = 0;
    }
    this.$appsvc.wscDetach(this);
  }

  public get viewId (): string {
    return this.$route.params.viewId;
  }

  public get votes (): VoteForVoterItem[] | undefined {
    const votes = this.info && this.info.votes;
    if (!votes) return undefined;
    return votes;
  }

  public get VoteState (): typeof VoteState {
    return VoteState;
  }
}
</script>
