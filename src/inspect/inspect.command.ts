import { Argument, Command, Option } from "commander";

export const inspectCommand = new Command("inspect")
  .summary("Access low-level information about activities/agreements/demands.")
  .addHelpText(
    "after",
    `Example:
$ golem-sdk inspect -k yagna-appkey activity 0x1234 --columns currentState agreement.agreementId agreement.timestamp agreement.demand.demandId
  `,
  )
  .addOption(new Option("-k, --yagna-appkey <key>", "Yagna app key").env("YAGNA_APPKEY").makeOptionMandatory())
  .option("--yagna-url [url]", "Yagna API URL", "http://127.0.0.1:7465")
  .addArgument(new Argument("<type>", "Type of the object to inspect.").choices(["activity", "agreement", "demand"]))
  .argument("<id>", "ID of the object to inspect.")
  .option(
    "-c, --columns [columns...]",
    "Columns to include in the output. For nested columns, use dot notation, e.g. 'agreement.agreementId'. Pass * to include all columns.",
    ["*"],
  )
  .action(async (type, id, options) => {
    const action = await import("./inspect.action.js");
    await action.default.inspectAction(type, id, options);
  });
