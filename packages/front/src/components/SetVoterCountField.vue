<template>
  <div style="display: flex; align-content: center; background: #dfd">
    <span>유권자 수:</span>
    <v-text-field v-model="temp" />
    <v-btn @click="apply">설정</v-btn>
  </div>
</template>
<script lang="ts">
import { Component, Prop, VModel, Vue, Watch } from 'vue-property-decorator';

@Component({})
export default class SetVoterCountField extends Vue {
  // @VModel({ type: Number, default: 0 }) public value!: number;
  @Prop() public value!: number;
  public temp: number = 0;

  public mounted (): void {
    this.onValueChanged();
  }

  public apply (): void {
    this.$emit('click', this.temp);
  }

  @Watch('value')
  public onValueChanged (): void {
    this.temp = this.value;
  }
}
</script>
