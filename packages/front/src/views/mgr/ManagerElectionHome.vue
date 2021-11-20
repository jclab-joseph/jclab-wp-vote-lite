<template>
  <v-main>
    <v-container v-if="!this.info">
      Loading...
    </v-container>
    <v-container v-else>
      <p><b>{{ this.info.title }}</b> 선거 관리</p>
      <div>
        <v-btn
          v-on:click="toggleTab('1')"
        >
          새로운 투표 생성
        </v-btn>
        <v-btn
          v-on:click="toggleTab('2')"
        >
          뷰 관리
        </v-btn>
        <v-btn
          v-on:click="toggleTab('3')"
        >
          유권자 코드 생성
        </v-btn>
      </div>
      <v-tabs-items v-if="tab" v-model="tab">
        <v-tab-item
          id="1"
        >
          <v-card
            elevation="2"
            outlined
            tile
          >
            <v-card-text>
              <table>
                <tr>
                  <td>투표 제목</td>
                  <td>
                    <v-text-field v-model="newVoteTitle"/>
                  </td>
                </tr>
                <tr v-for="(cadtItem, cadtIndex) in newVoteCandidates" :key="'new-cadt-' + cadtIndex">
                  <td style="background-color: #eee">
                    기호 {{ cadtIndex + 1 }} 번
                  </td>
                  <td>{{ cadtItem.name }}</td>
                  <td>
                    <v-btn v-on:click="newVoteRemoveCandidate(cadtIndex, cadtItem)">후보자 삭제</v-btn>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #eee">
                    기호 {{ newVoteCandidates.length + 1 }} 번
                  </td>
                  <td>
                    <v-text-field
                      v-model="newVoteCandidateName"
                      @keypress="onNewVoteCandidateNameKeyPress"
                    />
                  </td>
                  <td>
                    <v-btn v-on:click="newVoteAddCandidate">후보자 추가</v-btn>
                  </td>
                </tr>
              </table>
            </v-card-text>
            <v-card-actions>
              <span v-text="newVoteError" style="color: red"></span>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                v-on:click="newVoteApply"
                :loading="newVoteProceeding"
                :disabled="newVoteProceeding"
              >
                투표 생성하기
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-tab-item>
        <v-tab-item
          id="2"
        >
          <v-card
            elevation="2"
            outlined
            tile
          >
            <v-card-actions>
              <v-btn
                @click="viewNew()"
              >
                새로운 뷰 생성
              </v-btn>
            </v-card-actions>
            <v-card-text>
              <v-list flat v-if="tempShowViewList">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-list-item
                      v-for="(item) in views"
                      :key="`view-${item.viewId}`"
                      @click="viewCopyLink(item)"
                      class="view_item"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <v-list-item-title class="view_item_title">{{ item.url }}</v-list-item-title>
                      <v-list-item-action class="view_item_action">
                        <v-btn @click="viewDelete(item)">
                          삭제
                        </v-btn>
                      </v-list-item-action>
                    </v-list-item>
                  </template>
                  <span>Click to copy</span>
                </v-tooltip>
              </v-list>
            </v-card-text>
          </v-card>
        </v-tab-item>
        <v-tab-item
          id="3"
        >
          <v-card
            elevation="2"
            outlined
            tile
          >
            <v-card-actions v-cloak @drop.prevent="onNewVotersTemplateFileDrop" @dragover.prevent>
              <table style="flex-grow: 1">
                <tr>
                  <td>생성할 유권자 수</td>
                  <td>
                    <v-text-field v-model="newVotersCount"/>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <v-file-input
                      v-model="newVotersTemplateFile"
                      label="HWP 파일을 업로드 해 주세요"
                    />
                  </td>
                </tr>
              </table>
              <v-btn
                @click="newVoters()"
                :disabled="!isNewVotersAvailable && newVotersProceeding"
                :loading="newVotersProceeding"
              >
                새로운 유권자 생성
              </v-btn>
            </v-card-actions>
            <v-card-text>
              <v-list flat v-if="tempShowVoterList">
                <v-list-item
                  v-for="(item) in voters"
                  :key="`voter-${item.id}`"
                  class="view_item"
                >
                  <v-list-item-title class="view_item_title">{{ item.id }}</v-list-item-title>
                  <v-list-item-action class="view_item_action">
                    <v-btn @click="voterDelete(item)">
                      삭제
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-tab-item>
      </v-tabs-items>
      <div>
        연결된 유권자 수 : {{ nowConnectedVoterCount }}
      </div>
      <v-container>
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
                <SetVoterCountField :value="vote.voterCount"
                                    @click="(count) => setVoterCount(vote, count)"></SetVoterCountField>
                <VoteCandidateList
                  :list="vote.candidates"
                  type="row"
                ></VoteCandidateList>
              </div>
              <div v-if="vote.state === VoteState.voting" class="vote_card__status">
                투표가 진행 중 입니다.
                <div>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</div>
                <SetVoterCountField :value="vote.voterCount"
                                    @click="(count) => setVoterCount(vote, count)"></SetVoterCountField>
                <VoteCandidateList
                  :list="vote.candidates"
                  type="row"
                ></VoteCandidateList>
              </div>
              <div v-else-if="vote.state === VoteState.finished" class="vote_card__status">
                투표가 종료되었습니다.
                <div>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</div>
                <SetVoterCountField :value="vote.voterCount"
                                    @click="(count) => setVoterCount(vote, count)"></SetVoterCountField>
                <VoteCandidateList
                  :list="vote.candidates"
                  type="row"
                ></VoteCandidateList>
              </div>
              <div v-else-if="vote.state === VoteState.counting" class="vote_card__status">
                개표 중 입니다.
                <div>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</div>
                <VoteCandidateList
                  :list="vote.candidates"
                  type="row"
                ></VoteCandidateList>
              </div>
              <div
                v-else-if="vote.state === VoteState.completed" class="vote_card__status"
              >
                개표 되었습니다.
                <div>투표율 : {{ vote.voterTurnout }} % ({{ vote.votedCount }} / {{ vote.voterCount }})</div>
                <VoteCandidateList
                  :list="vote.candidates"
                  type="row"
                ></VoteCandidateList>
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
            <div style="width: 50%; display: flex; align-items: stretch">
              <v-btn
                v-if="vote.state === VoteState.ready"
                class="vote_card__button"
                v-on:click="voteStart(vote.voteId)"
                :loading="voteControlProceeding"
                :disabled="voteControlProceeding"
              >
                투표 시작
              </v-btn>
              <v-btn
                v-if="vote.state === VoteState.voting"
                class="vote_card__button"
                v-on:click="voteStop(vote.voteId)"
                :loading="voteControlProceeding"
                :disabled="voteControlProceeding"
              >
                투표 종료
              </v-btn>
              <div v-else-if="vote.state === VoteState.finished" class="vote_card__button">
                <div>투표가 완료 되었습니다.</div>
                <v-btn
                  v-on:click="voteCount(vote.voteId)"
                  :loading="voteControlProceeding"
                  :disabled="voteControlProceeding"
                >
                  개표
                </v-btn>
                <v-btn
                  v-on:click="voteStart(vote.voteId)"
                  :loading="voteControlProceeding"
                  :disabled="voteControlProceeding"
                >
                  투표 재개
                </v-btn>
              </div>
              <div v-else-if="vote.state === VoteState.counting" class="vote_card__button">
                <div>개표 중 입니다.</div>
              </div>
              <VoteResultChart
                v-else-if="vote.state === VoteState.completed"
                class="vote_card__button chart"
                :result="vote.result"
              ></VoteResultChart>
            </div>
          </v-card-text>
        </v-card>
      </v-container>
    </v-container>
  </v-main>
</template>
<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity .25s;
}

.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */
{
  opacity: 0;
}

.chart {
  height: 14em;
}

.vote_card__status {
}

.vote_card__button {
  width: 100%;
  height: auto !important;
  text-align: center;
  font-weight: bold;
  font-size: 1.5em;
}

.view_item {
  background: #ccc;
}

.view_item_title {
}

.error_message {
  color: red;
}
</style>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { AxiosError, AxiosResponse } from 'axios';
import contentDisposition from 'content-disposition';
import { ElectionItem, VoteItem } from '@/wrappers';
import { ElectionBase, View, Voter, VoterList, VoteState } from '@jclab-wp/vote-lite-common';
import VoteResultChart from '@/components/VoteResultChart.vue';
import VoteCandidateList from '@/components/VoteCandidateList.vue';
import { WsCommunicator } from '@/service/appsvc';
import SetVoterCountField from '@/components/SetVoterCountField.vue';

type MenuName = null | 'new_vote';

interface NewVoteCandidate {
  name: string;
}

function downloadBlob (blob: Blob, name: string) {
  // Convert your blob into a Blob URL (a special url that points to an object in the browser's memory)
  const blobUrl = URL.createObjectURL(blob);

  // Create a link element
  const link = document.createElement('a');

  // Set link's href to point to the Blob URL
  link.href = blobUrl;
  link.download = name;

  // Append link to the body
  document.body.appendChild(link);

  // Dispatch click event on the link
  // This is necessary as link.click() does not work on the latest firefox
  link.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );

  // Remove link from body
  document.body.removeChild(link);
}

@Component({
  components: {
    VoteResultChart,
    VoteCandidateList,
    SetVoterCountField,
  },
})
export default class ManagerElectionHome extends Vue {
  public menu: MenuName = null;

  public info: ElectionItem | null = null;

  public tab: string = '';

  public newVoteProceeding: boolean = false;
  public newVoteError: string = '';
  public newVoteTitle: string = '가나다 투표';
  public newVoteCandidates: NewVoteCandidate[] = [
    { name: '번쩍 에디' },
    { name: '새침한 프로도' },
    { name: '귀여운 안나' },
  ];

  public newVoteCandidateName: string = '';

  public views: View[] = [];
  public tempShowViewList: boolean = true;

  public newVotersTemplateFile: File | null = null;
  public newVotersCount: number = 0;
  public newVotersProceeding: boolean = false;

  public voters: Voter[] = [];
  public tempShowVoterList: boolean = true;

  public voteControlProceeding: boolean = false;

  public wsc!: WsCommunicator;
  public refreshTimer: number = 0;
  public nowConnectedVoterCount: number = 0;

  mounted (): void {
    this.fetchElectionInfo();
    this.fetchViewList();

    this.wsc = this.$appsvc.wscAttach(this);
    this.wsc.on('election.now.voter.count', (data) => {
      this.nowConnectedVoterCount = data.count;
    });
    this.refreshTimer = setInterval(() => {
      if (this.wsc.isConnected) {
        this.wsc.wsEmit('request.election.now.voter.count', { elecId: this.elecId });
      }
    }, 1000);
  }

  public beforeDestroy (): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = 0;
    }
  }

  public get elecId (): string {
    return this.$route.params.elecId;
  }

  public get votes (): VoteItem[] {
    return this.info?.votes || [];
  }

  public toggleTab (tab: string): void {
    if (this.tab === tab) {
      this.tab = '';
    } else {
      this.tab = tab;
    }
  }

  public newVoteRemoveCandidate (cadtIndex: number, cadtItem: NewVoteCandidate): void {
    this.newVoteCandidates.splice(cadtIndex, 1);
  }

  public newVoteAddCandidate (): void {
    if (!this.newVoteCandidateName) {
      alert('이름을 입력 해 주세요');
      return;
    }
    this.newVoteCandidates.push({
      name: this.newVoteCandidateName,
    });
    this.newVoteCandidateName = '';
  }

  public onNewVotersTemplateFileDrop (e: any): void {
    this.newVotersTemplateFile = e.dataTransfer.files[0] || null;
  }

  public fetchVoterList (): void {
    this.$appsvc.httpClient.get(
      '/api/mgr/election/' + this.elecId + '/voters',
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<VoterList>) => {
        this.$set(this, 'voters', response.data.list);
        this.$set(this, 'tempShowVoterList', false);
        this.$nextTick(() => {
          this.tempShowViewList = true;
        });
      })
      .catch((err) => {
        console.error(err);
        alert('오류: ' + err);
      });
  }

  public newVoters (): void {
    this.newVotersProceeding = true;
    this.$appsvc.httpClient
      .post(
        '/api/mgr/election/' + this.elecId + '/generate-voters?count=' + this.newVotersCount,
        this.newVotersTemplateFile,
        {
          headers: {
            'content-type': 'application/octet-stream',
            accept: 'application/octet-stream, */*'
          },
          responseType: 'blob',
        },
      )
      .then((response: AxiosResponse<Blob>) => {
        const parsedCD = contentDisposition.parse(response.headers['content-disposition']);
        console.log('parsedCD: ', parsedCD);
        downloadBlob(response.data, 'output.hwp');
        this.fetchVoterList();
      })
      .catch((err) => {
        console.error(err);
        alert('ERROR: ' + err);
      })
      .finally(() => {
        this.newVotersProceeding = false;
      });
  }

  public voterDelete (item: Voter): void {
    this.$appsvc.httpClient.delete(
      '/api/mgr/election/' + this.elecId + '/voter/' + item.id,
    )
      .then((response) => {
        alert('성공');
        this.fetchVoterList();
      })
      .catch((err) => {
        console.error(err);
        alert('실패: ' + err);
      });
  }

  public get isNewVotersAvailable (): boolean {
    return (this.newVotersTemplateFile || false) && (this.newVotersCount > 0);
  }

  public fetchElectionInfo (): void {
    this.$appsvc.httpClient.get(
      '/api/mgr/election/' + this.elecId + '/info',
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<ElectionBase>) => {
        console.log(response.data);
        this.info = new ElectionItem(response.data);
        console.log(this.info);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  public fetchViewList (): void {
    this.$appsvc.httpClient.get(
      '/api/mgr/election/' + this.elecId + '/views',
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<View[]>) => {
        this.$set(this, 'views', response.data);
        this.$set(this, 'tempShowViewList', false);
        this.$nextTick(() => {
          this.tempShowViewList = true;
        });
      })
      .catch((err) => {
        console.error(err);
        alert('오류: ' + err);
      });
  }

  public newVoteApply (): void {
    this.newVoteProceeding = true;
    this.$appsvc.httpClient.put(
      '/api/mgr/election/' + this.elecId + '/vote',
      {
        title: this.newVoteTitle,
        candidates: this.newVoteCandidates,
      },
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<ElectionBase>) => {
        console.log(response.data);
        this.newVoteClear();
        alert('생성되었습니다');
        this.fetchElectionInfo();
      })
      .catch((err: AxiosError) => {
        console.error(err);
        this.newVoteError = err.message;
      })
      .finally(() => {
        this.newVoteProceeding = false;
      });
  }

  public newVoteClear (): void {
    this.newVoteError = '';
    this.newVoteTitle = '';
    this.newVoteCandidates = [];
  }

  public voteStart (voteId: string): void {
    this.voteControl(voteId, 'start');
  }

  public voteStop (voteId: string): void {
    this.voteControl(voteId, 'stop');
  }

  public voteCount (voteId: string): void {
    this.voteControl(voteId, 'count');
  }

  public voteControl (voteId: string, operation: string): void {
    this.voteControlProceeding = true;
    this.$appsvc.httpClient.post(
      '/api/mgr/vote/' + voteId + '/' + operation,
    )
      .then((response) => {
        alert('완료');
      })
      .catch((err) => {
        console.error(err);
        alert(err);
      })
      .finally(() => {
        this.voteControlProceeding = false;
        this.fetchElectionInfo();
      });
  }

  public setVoterCount (vote: VoteItem, count: number): void {
    this.$appsvc.httpClient.post(
      '/api/mgr/vote/' + vote.voteId + '/voter_count',
      {
        voterCount: count,
      },
    )
      .then((res) => {
        alert('변경되었습니다');
      })
      .catch((err) => {
        console.error(err);
        alert('error: ' + err);
      });
  }

  public viewNew (): void {
    this.$appsvc.httpClient.put(
      '/api/mgr/election/' + this.elecId + '/view',
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<View>) => {
        alert('생성되었습니다');
        this.fetchViewList();
      })
      .catch((err) => {
        console.error(err);
        alert('error: ' + err);
      });
  }

  public viewCopyLink (item: View): void {
    navigator.clipboard.writeText(item.url);
  }

  public viewDelete (item: View): void {
    this.$appsvc.httpClient.delete(
      '/api/mgr/view/' + item.viewId,
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<View>) => {
        alert('삭제되었습니다');
        this.fetchViewList();
      })
      .catch((err) => {
        console.error(err);
        alert('error: ' + err);
      });
  }

  public onNewVoteCandidateNameKeyPress (evt: KeyboardEvent): void {
    if (evt.key === 'Enter') {
      this.newVoteAddCandidate();
    }
  }

  public get VoteState (): typeof VoteState {
    return VoteState;
  }
}
</script>
