<template>
  <v-main>
    <v-container v-if="!votes" fluid>
      Loading...
    </v-container>
    <v-container v-else fluid>
      <v-card
        v-for="(vote, voteSeq) in votes" :key="`vote-${voteSeq}`"
        elevation="2"
        outlined
        tile
      >
        <v-card-text style="display: flex; flex-direction: row">
          <div style="width: 50%;">
            <p class="text-h4 text--primary">
              {{ vote.title }}
            </p>
            <div v-if="vote.state === VoteState.ready" class="vote_card__status">
              투표 개시 대기 중 입니다.
            </div>
            <div v-if="vote.state === VoteState.voting && !vote.voted" class="vote_card__status">
              투표 해 주세요
            </div>
            <div v-else-if="vote.state === VoteState.voting && vote.voted" class="vote_card__status">
              투표 하였습니다
              <VoteCandidateList
                :list="vote.candidates"
                type="tile"
              ></VoteCandidateList>
            </div>
            <div v-else-if="vote.state === VoteState.finished" class="vote_card__status">
              투표가 종료되었습니다.
              <VoteCandidateList
                :list="vote.candidates"
                type="tile"
              ></VoteCandidateList>
            </div>
            <div v-else-if="vote.state === VoteState.counting" class="vote_card__status">
              개표 중 입니다.
              <VoteCandidateList
                :list="vote.candidates"
                type="tile"
              ></VoteCandidateList>
            </div>
            <div
              v-else-if="vote.state === VoteState.completed" class="vote_card__status"
            >
              개표 되었습니다.
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
          <div style="width: 50%; display: flex; align-items: stretch;">
            <div v-if="vote.state < VoteState.voting" class="vote_card__right">
              <VoteCandidateList
                :list="vote.candidates"
                type="row"
              ></VoteCandidateList>
            </div>
            <v-btn
              v-if="vote.state === VoteState.voting && !vote.voted"
              v-on:click="toggleVote(vote.voteId)"
              class="vote_card__button"
            >
              <v-icon>fas fa-vote-yea</v-icon>
              투표하기
            </v-btn>
<!--            <v-btn-->
<!--              v-else-if="vote.state !== VoteState.completed"-->
<!--              v-on:click="toggleVote(vote.voteId)"-->
<!--              class="vote_card__button"-->
<!--            >-->
<!--              <v-icon>fas fa-vote-yea</v-icon>-->
<!--              정보 보기-->
<!--            </v-btn>-->
            <VoteResultChart
              v-else-if="vote.state === VoteState.completed"
              :result="vote.result"
            ></VoteResultChart>
          </div>
        </v-card-text>
        <v-card-text v-if="vote.state === VoteState.voting && !vote.voted && selectedVoteId === vote.voteId">
          <v-list two-line>
            <v-list-item-group
              v-model="selectedCadtId"
            >
              <v-list-item
                v-for="(cadt, cadtSeq) in vote.candidates" :key="`${vote.voteId}-cadt-${cadtSeq}`"
                avatar
                :value="cadt.cadtId"
                active-class="deep-purple--text text--accent-4"
              >
                <v-list-item-icon>
                  기호 {{ cadt.number }} 번
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>{{ cadt.name }}</v-list-item-title>
                  <v-list-item-subtitle> {{ selectedCadtId ? '선택됌' : '' }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list-item-group>
          </v-list>
          <div v-if="selectedCadtId">
            {{ selectedCadtName }} 에게 한 마디!
            <v-textarea v-model="cadtMessage" style="background-color: #eee"></v-textarea>
            <div style="font-size: 0.9em">
              위 메세지는 투표 종료 후 후보자에게 전달됩니다.
              응원의 따뜻한 한 마디 해주세요!
            </div>
          </div>
          <v-btn
            :disabled="!selectedCadtId || proceeding"
            :loading="proceeding"
            @click="voteApply"
          >
            투표하기
          </v-btn>
          <span class="error_message">
            {{ voteApplyError }}
          </span>
        </v-card-text>
        <v-card-text v-else-if="selectedVoteId === vote.voteId">
          <div
            v-for="(cadt, cadtSeq) in vote.candidates" :key="`${vote.voteId}-cadt-${cadtSeq}`"
          >
            기호 {{ cadt.number }} 번 {{ cadt.name }}
            <!-- 당선여부 -->
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </v-main>
</template>
<style scoped>
.vote_card__status {
}

.vote_card__right {
  flex-grow: 1;
}

.vote_card__button {
  width: 100%;
  height: auto !important;
  text-align: center;
  font-weight: bold;
  font-size: 1.5em;
}

.error_message {
  color: red;
}
</style>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import VoteResultChart from '@/components/VoteResultChart.vue';
import { ElectionForVoterItem, ElectionItem, VoteForVoterItem, VoteItem } from '@/wrappers';
import { VoteRequest, VoteState } from '@jclab-wp/vote-lite-common';
import { WsCommunicator } from '@/service/appsvc';
import VoteCandidateList from '@/components/VoteCandidateList.vue';

@Component({
  components: {
    VoteCandidateList,
    VoteResultChart
  },
})
export default class VoterHome extends Vue {
  public wsc!: WsCommunicator;
  public refreshTimer: number = 0;

  public info: ElectionForVoterItem | null = null;

  public selectedVoteId: string = '';
  public selectedCadtId: string = '';
  public cadtMessage: string = '';

  public proceeding: boolean = false;
  public voteApplyError: string = '';

  public mounted (): void {
    this.wsc = this.$appsvc.wscAttach(this);
    this.wsc.on('connect', () => {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.wsc.wsEmit('request.election.update');
      this.refreshTimer = setInterval(() => {
        if (this.info && this.info.votes) {
          const voteIds = this.info.votes
            .filter(v => v.state !== VoteState.completed)
            .map(v => v.voteId);
          if (voteIds.length > 0) {
            this.wsc.wsEmit('request.votes.update.status', voteIds);
          }
        }
      }, 1000);
    });
    this.wsc.on('election.update', (election) => {
      this.fetchElection();
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
      }
    });
    if (this.wsc.isConnected) {
      this.wsc.wsEmit('request.election.update');
    }
  }

  public get electionTitle (): string {
    return this.$store.state.voter.electionTitle;
  }

  public get votes (): VoteForVoterItem[] | undefined {
    const votes = this.info && this.info.votes;
    if (!votes) return undefined;
    console.log('votes: ', votes);
    return votes;
  }

  public fetchElection (): void {
    this.$appsvc.httpClient.get(
      '/api/voter/election',
    )
      .then((response) => {
        this.info = new ElectionForVoterItem(response.data);
      })
      .catch((err) => {
        alert('에러! ' + err);
      });
  }

  public toggleVote (voteId: string): void {
    if (this.selectedVoteId === voteId) {
      this.selectedVoteId = '';
    } else {
      this.selectedVoteId = voteId;
    }
    this.selectedCadtId = '';
  }

  public get selectedCadtName (): string {
    const votes = this.info?.votes;
    if (!votes || !this.selectedVoteId || !this.selectedCadtId) return '';
    const vote = votes.find(v => v.voteId === this.selectedVoteId);
    if (!vote) return '';
    const cadt = vote.candidates.find(c => c.cadtId === this.selectedCadtId);
    if (!cadt) return '';
    return cadt.name;
  }

  public voteApply (): void {
    const r = confirm('정말 투표를 진행하시겠습니까? 투표 내용은 변경할 수 없습니다.');
    if (!r) return;
    this.proceeding = true;
    this.voteApplyError = '';
    this.$appsvc.httpClient.post(
      '/api/voter/vote',
      {
        voteId: this.selectedVoteId,
        cadtId: this.selectedCadtId,
        message: this.cadtMessage,
      } as VoteRequest,
    )
      .then(() => {
        const vote: VoteForVoterItem | undefined = this.votes?.find(v => v.voteId === this.selectedVoteId);
        if (vote) {
          vote.voted = true;
        }
        alert('성공!');
        this.fetchElection();
        this.selectedVoteId = '';
        this.selectedCadtId = '';
      })
      .catch((err) => {
        this.voteApplyError = err.message;
      })
      .finally(() => {
        this.proceeding = false;
      });
  }

  public get VoteState (): typeof VoteState {
    return VoteState;
  }
}
</script>
