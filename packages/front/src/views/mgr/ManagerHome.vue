<template>
  <v-main>
    <v-container>
      <div>
        <v-btn
          v-on:click="toggleTab('1')"
        >
          새로운 선거 생성
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
                  <td>선거 제목</td>
                  <td>
                    <v-text-field
                      v-model="newElecTitle"
                      :rules="newElecTitleRules"
                    />
                  </td>
                </tr>
                <tr>
                  <td>유권자 ID Prefix</td>
                  <td>
                    <v-text-field
                      v-model="newElecVoterIdPrefix"
                      :rules="newElecVoterIdPrefixRules"
                    /><br />
                    <small>[유권자 ID PREFIX] + 랜덤숫자 형식으로 유권자 ID가 생성됩니다.</small>
                  </td>
                </tr>
              </table>
            </v-card-text>
            <v-card-actions>
              <span v-text="newElecError" style="color: red"></span>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                v-on:click="newElecApply"
                :loading="newElecProceeding"
                :disabled="newElecProceeding"
              >
                선거 생성하기
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-tab-item>
      </v-tabs-items>
      <p>선거 목록</p>
      <table style="width: 100%">
        <thead>
        <th>TITLE</th>
        <th>CREATED_AT</th>
        </thead>
        <tbody>
        <tr v-for="(item, index) in electionList" :key="'elec-' + index">
          <td><router-link :to="`/mgr/election/${item.elecId}`">{{ item.title }}</router-link></td>
          <td>{{ item.createdAtAsDate }}</td>
        </tr>
        </tbody>
      </table>
    </v-container>
  </v-main>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { AxiosError, AxiosResponse } from 'axios';
import { ElectionItem } from '@/wrappers';
import { ElectionBase } from '@jclab-wp/vote-lite-common';

@Component({})
export default class ManagerHome extends Vue {
  public tab: string = '';

  public electionList: ElectionItem[] = [];

  public newElecTitle: string = '';
  public newElecVoterIdPrefix: string = '';
  public newElecError: string = '';
  public newElecProceeding: boolean = false;
  public newElecTitleRules: any[] = [
    (v: string) => !!v || '입력해 주세요',
  ];

  public newElecVoterIdPrefixRules: any[] = [
    (v: string) => !!v || '입력해 주세요',
    (v: string) => v.length >= 4 || '4자 이상 적어 주세요',
  ];

  public mounted (): void {
    this.fetchElectionList();
  }

  public fetchElectionList (): void {
    this.$appsvc.httpClient.get(
      '/api/mgr/election/list',
      {
        withCredentials: true
      }
    )
      .then((response: AxiosResponse<ElectionBase[]>) => {
        this.electionList = response.data.map(v => new ElectionItem(v));
      })
      .catch((err) => {
        console.error(err);
      });
  }

  public toggleTab (tab: string): void {
    if (this.tab === tab) {
      this.tab = '';
    } else {
      this.tab = tab;
    }
  }

  public newElecApply (): void {
    this.newElecProceeding = true;
    this.$appsvc.httpClient.put(
      '/api/mgr/election/new',
      {
        title: this.newElecTitle,
        voterIdPrefix: this.newElecVoterIdPrefix
      },
      {
        withCredentials: true,
      },
    )
      .then((response: AxiosResponse<ElectionBase>) => {
        console.log(response.data);
        this.newElecClear();
        alert('생성되었습니다');
        this.fetchElectionList();
      })
      .catch((err: AxiosError) => {
        console.error(err);
        this.newElecError = err.message;
      })
      .finally(() => {
        this.newElecProceeding = false;
      });
  }

  public newElecClear (): void {
    this.newElecError = '';
    this.newElecTitle = '';
  }
}
</script>
