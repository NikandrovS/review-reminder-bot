const {
  getTask,
  getBotState,
  getApprovers,
} = require("./helpers/storageHelpers");
const { isInHuddleStatus, replyWithText } = require("./helpers/slackHelpers");
const { roles } = require("./constants");
const { CronJob } = require("cron");

const db = require("./config/dbConfig");

const newCronJob = (channel, task_ts) => {
  var job = new CronJob(
    // '0 30 12-19 * * 1-5',
    "*/15 * * * * *",
    async function () {
      if (!getBotState()) return;

      let task = getTask(task_ts);

      if (!task) return job.stop();
      if (!task.status) return;

      let devs = [];

      for (let i = 0; i < roles.length; i++) {
        let devList = getApprovers(roles[i]).filter((id) => id !== task.author);
        task.approved.forEach(
          (id) => (devList = devList.filter((dev) => dev !== id))
        );
        if (devList.length) {
          devs = devList;
          break;
        }
      }

      // clear postpone list from expired records
      const actualPostponed = task.postponed.reduce(
        (acc, item) => (Date.now() < item.expired ? [...acc, item] : acc),
        []
      );
      db.push(`/state/tasks/${task_ts}/postponed`, actualPostponed);

      // postpone users in a huddle
      for (const id of devs) {
        const res = await isInHuddleStatus(id);
        if (res)
          db.push(
            `/state/tasks/${task_ts}/postponed[]`,
            { id, expired: Date.now() + 1000 * 60 * 50 },
            true
          );
      }

      task = getTask(task_ts);

      // remove postponed ids
      devs = devs.reduce(
        (acc, id) =>
          task.postponed.map((obj) => obj.id).includes(id) ? acc : [...acc, id],
        []
      );

      const mentionIds = devs.reduce((acc, id) => (acc += `<@${id}> `), "");

      if (!devs.length) return;
      await replyWithText(channel, `Требуется ревью ${mentionIds}`, task_ts);
    },
    null,
    true,
    "Europe/Moscow"
  );
};

module.exports = newCronJob;
