export interface ConfigProvider {
  readonly name: string;
  probe(): Promise<boolean>;
  read(): Promise<Record<string, string>>;
}
