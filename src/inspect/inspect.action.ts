import { Yagna } from "@golem-sdk/golem-js";
import { InspectOptions } from "./inspect.options";
import chalk from "chalk";
import _ from "lodash";

async function getDemandDetails(yagna: Yagna, demandId: string) {
  const api = yagna.getApi().market;
  const { data: activeDemands } = await api.getDemands();
  const demandDetails = activeDemands.find((demand) => demand.demandId === demandId);
  if (!demandDetails) {
    throw new Error("Demand not found");
  }
  return demandDetails;
}

async function getAgreementDetails(yagna: Yagna, agreementId: string) {
  const api = yagna.getApi().market;
  const { data: agreementDetails } = await api.getAgreement(agreementId);
  // agreementDetails already has demand details included
  return agreementDetails;
}

async function getActivityDetails(yagna: Yagna, activityId: string) {
  const api = yagna.getApi().activity.state;
  const {
    data: { state },
  } = await api.getActivityState(activityId);
  const { data: usage } = await api.getActivityUsage(activityId);
  const agreementId = await api.getActivityAgreementId(activityId);
  return {
    currentState: state[0],
    nextState: state[1],
    usage,
    agreement: await getAgreementDetails(yagna, agreementId),
  };
}

function printSelectedColumns(obj: object, columns: string[]) {
  if (columns[0] === "*") {
    console.log(JSON.stringify(obj, null, 2));
    return;
  }
  const selectedColumns = _.pick(obj, columns);
  console.log(JSON.stringify(selectedColumns, null, 2));
}

export async function inspectAction(type: string, id: string, options: InspectOptions) {
  const yagna = new Yagna({
    apiKey: options.yagnaAppkey,
    basePath: options.yagnaUrl,
  });
  try {
    await yagna.connect();
  } catch (err) {
    console.log(chalk.red(`Cannot connect to Yagna, check the app-key and URL`));
    process.exitCode = 1;
    return;
  }
  if (type === "activity") {
    try {
      const activity = await getActivityDetails(yagna, id);
      printSelectedColumns(activity, options.columns);
    } catch (err) {
      console.log(chalk.red(`Cannot get activity details, are you sure the activity ID is correct?`));
      process.exitCode = 1;
      return;
    }
  }
  if (type === "agreement") {
    try {
      const agreement = await getAgreementDetails(yagna, id);
      printSelectedColumns(agreement, options.columns);
    } catch (err) {
      console.log(chalk.red(`Cannot get agreement details, are you sure the agreement ID is correct?`));
      process.exitCode = 1;
      return;
    }
  }
  if (type === "demand") {
    try {
      const demand = await getDemandDetails(yagna, id);
      printSelectedColumns(demand, options.columns);
    } catch (err) {
      console.log(
        chalk.red(`Cannot get demand details, are you sure the demand ID is correct and the demand is still active?`),
      );
      process.exitCode = 1;
      return;
    }
  }
}
