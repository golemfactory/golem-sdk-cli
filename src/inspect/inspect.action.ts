import { GolemNetwork } from "@golem-sdk/golem-js";
import { InspectOptions } from "./inspect.options";
import chalk from "chalk";
import _ from "lodash";

async function getDemandDetails(glm: GolemNetwork, demandId: string) {
  const api = glm.services.yagna.market;
  const activeDemands = await api.getDemands();
  const demandDetails = activeDemands.find((demand) => demand.demandId === demandId);
  if (!demandDetails) {
    throw new Error("Demand not found");
  }
  return demandDetails;
}

async function getAgreementDetails(glm: GolemNetwork, agreementId: string) {
  const api = glm.services.yagna.market;
  const agreementDetails = await api.getAgreement(agreementId);
  // agreementDetails already has demand details included
  return agreementDetails;
}

async function getActivityDetails(glm: GolemNetwork, activityId: string) {
  const api = glm.services.yagna.activity.state;
  const { state } = await api.getActivityState(activityId);
  const usage = await api.getActivityUsage(activityId);
  const agreementId = await api.getActivityAgreement(activityId);
  return {
    currentState: state[0],
    nextState: state[1],
    usage,
    agreement: await getAgreementDetails(glm, agreementId),
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
  const glm = new GolemNetwork({
    api: {
      url: options.yagnaUrl,
      key: options.yagnaAppkey,
    },
  });
  try {
    await glm.connect();
  } catch (err) {
    console.log(chalk.red(`Cannot connect to Yagna, check the app-key and URL\n`));
    console.log(chalk.red(`${err}`));
    process.exitCode = 1;
    return;
  }
  if (type === "activity") {
    try {
      const activity = await getActivityDetails(glm, id);
      printSelectedColumns(activity, options.columns);
    } catch (err) {
      console.log(chalk.red(`Cannot get activity details, are you sure the activity ID is correct?\n`));
      console.log(chalk.red(`${err}`));
      process.exitCode = 1;
      return;
    }
  }
  if (type === "agreement") {
    try {
      const agreement = await getAgreementDetails(glm, id);
      printSelectedColumns(agreement, options.columns);
    } catch (err) {
      console.log(chalk.red(`Cannot get agreement details, are you sure the agreement ID is correct?\n`));
      console.log(chalk.red(`${err}`));
      process.exitCode = 1;
      return;
    }
  }
  if (type === "demand") {
    try {
      const demand = await getDemandDetails(glm, id);
      printSelectedColumns(demand, options.columns);
    } catch (err) {
      console.log(
        chalk.red(`Cannot get demand details, are you sure the demand ID is correct and the demand is still active?\n`),
      );
      console.log(chalk.red(`${err}`));
      process.exitCode = 1;
      return;
    }
  }
}
