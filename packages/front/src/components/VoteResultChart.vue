<template>
  <div>
    <table>
      <tr v-for="(item, seq) in this.sortedList" :key="`vr-${item.cadtId}`">
        <td class="content_row" :class="{'top_rate_1': seq === 0, 'top_rate_2': seq === 1, 'top_rate_3': seq === 2}"><b>{{ item.name }}</b></td>
        <td class="content_row count" :class="{'top_rate_1': seq === 0, 'top_rate_2': seq === 1, 'top_rate_3': seq === 2}">{{ item.count }} 표</td>
      </tr>
    </table>
  </div>
</template>
<style scoped>
.content_row {
  padding-top: 0.25em;
  padding-bottom: 0.25em;
}
.top_rate_1 {
  font-size: 2em;
}
.top_rate_2 {
  font-size: 1.7em;
}
.top_rate_3 {
  font-size: 1.3em;
}
.count {
  padding-left: 1em;
  text-align: center;
}
</style>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { VoteCadtResult, VoteResult } from '@jclab-wp/vote-lite-common';

@Component({
  // extends: Doughnut
})
export default class VoteResultChart extends Vue { // Vue<Doughnut>
  @Prop() public result!: VoteResult;

  public get list (): VoteCadtResult[] {
    return this.result.candidates;
  }

  public get sortedList (): VoteCadtResult[] {
    return this.list.sort((x, y) => {
      const a = (typeof x.count === 'number') ? x.count : parseInt(x.count);
      const b = (typeof y.count === 'number') ? y.count : parseInt(y.count);
      if (a > b) return -1;
      if (a < b) return 1;
      return 0;
    });
  }

  // public self: Vue & Doughnut;
  //
  // constructor () {
  //   super();
  //   this.self = this as any;
  // }
  //
  // public get chartdata (): any {
  //   const maxCount = this.list.reduce((m: number, c) => {
  //     if (m < c.count) return c.count;
  //     return m;
  //   }, 0);
  //   return {
  //     labels: this.list.map(v => `${v.cadtNumber}: ${v.cadtName}`),
  //     datasets: [
  //       {
  //         backgroundColor: this.list.map(v => (v.count === maxCount && maxCount > 0) ? '#f87979' : '#cccccc'),
  //         data: this.list.map(v => v.count)
  //       }
  //     ]
  //   };
  // }
  //
  // public options = {
  //   responsive: true,
  //   maintainAspectRatio: false
  // };
  //
  // public mounted () {
  //   this.self.renderChart(this.chartdata, this.options);
  // }
}
</script>
