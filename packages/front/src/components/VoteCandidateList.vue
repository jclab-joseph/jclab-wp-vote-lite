<template>
  <div>
    <div v-if="type === 'row'" style="display: flex; flex-flow: column; flex-wrap: wrap;">
      <div v-for="(item, seq) in this.sortedList" :key="`vc-${item.cadtId}`" :class="{'item-type-0': (seq % 2), 'item-type-1': !(seq % 2)}" style="padding: 0.25em">
        <span style="padding-right: 1em">기호 {{ item.number }}</span>
        <span><b>{{ item.name }}</b></span>
      </div>
    </div>
    <div v-else-if="type === 'tile'" style="display: flex; flex-flow: row wrap; flex-wrap: wrap;">
      <div v-for="(item, seq) in this.sortedList" :key="`vc-${item.cadtId}`" :class="{'item-type-0': (seq % 2), 'item-type-1': !(seq % 2)}" style="padding: 0.25em">
        <span style="padding-right: 1em">기호 {{ item.number }}</span>
        <span><b>{{ item.name }}</b></span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.content_row {
  padding-top: 0.25em;
  padding-bottom: 0.25em;
}

.item-type-0 {
  background-color: #eee;
}

.item-type-1 {
  background-color: #ddd;
}
</style>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { VoteCadtBase } from '@jclab-wp/vote-lite-common';

@Component({})
export default class VoteCandidateList extends Vue {
  @Prop() public type!: 'tile' | 'row';
  @Prop() public list!: VoteCadtBase[];

  public get sortedList (): VoteCadtBase[] {
    return this.list.sort((x, y) => {
      if (x.number < y.number) return -1;
      if (x.number > y.number) return 1;
      return 0;
    });
  }
}
</script>
