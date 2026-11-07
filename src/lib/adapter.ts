/**
 * Bot 运行时适配边界。
 *
 * 名册里的角色已经创建，但当前没有可调用的运行时 API，也没有文档化的认证接入。
 * 这个模块故意不提供派发、鉴权、任务查询或花费执行，也不会发起网络请求。
 * 界面只展示名册，并生成供人复制后自行粘贴的手动交接文本。
 */
export const runtimeAdapter = {
  id: "bot-runtime",
  state: "not_connected",
  dispatch: false,
  readJobs: false,
  authenticate: false,
  executeAds: false,
  readSpend: false,
  readRevenue: false,
  monitorNetwork: false,
  reason:
    "没有可调用的 Bot 运行时，也没有已文档化的认证或投放接口。不能把名册显示成在线、在岗或已完成任务。",
} as const;

export type RuntimeAction = keyof Pick<
  typeof runtimeAdapter,
  | "dispatch"
  | "readJobs"
  | "authenticate"
  | "executeAds"
  | "readSpend"
  | "readRevenue"
  | "monitorNetwork"
>;

export function runtimeCan(action: RuntimeAction): false {
  return runtimeAdapter[action];
}
