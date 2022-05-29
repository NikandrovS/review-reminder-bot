const { createEventAdapter } = require("@slack/events-api");
const db = require("./src/config/dbConfig");
require("dotenv").config();

const restartExistingTasks = require("./src/helpers/restartExistingTasks");
const newCronJob = require("./src/cron");
const {
  appendRemainApproversLenght,
  removeReactionByName,
  setTaskStatusActive,
  setTaskStatusPaused,
  getReactionsList,
  replyWithText,
} = require("./src/helpers/slackHelpers");
const {
  getApproversLenght,
  getBotState,
  getBotId,
  getTask,
  isDev,
} = require("./src/helpers/storageHelpers");
const {
  isTaskForReview,
  parseCommand,
  parseDevList,
} = require("./src/helpers/parseHelpers");
const { numberEmojisText } = require("./src/constants");
const slackSigninSecret = process.env.SLACK_SIGNIN_SECRET;
const slackEvents = createEventAdapter(slackSigninSecret);
const port = 3000;

restartExistingTasks();

slackEvents.on("reaction_added", async (event) => {
  if (event.reaction !== "eyes" || !isDev(event.user)) return;

  let task = getTask(event.item.ts);

  if (!task) return;

  db.push(
    `/state/tasks/${event.item.ts}/postponed[]`,
    { id: event.user, expired: Date.now() + 1000 * 20 },
    true
  );
});

slackEvents.on("app_mention", async (event) => {
  const result = parseCommand(event.text);

  if (!result) return;

  const { command, botId } = result.groups;

  switch (command.toLocaleLowerCase()) {
    case "start":
      db.push("/state", { active: 1, botId, channel: event.channel }, false);
      await replyWithText(event.channel, "Бот запущен", event.event_ts);
      break;
    case "stop":
      db.push("/state", { active: 0 }, false);
      await replyWithText(event.channel, "Бот остановлен", event.event_ts);
      break;
    case "disable":
      if (!event.thread_ts) return;
      db.delete(`/state/tasks/${event.thread_ts}`);
      await replyWithText(
        event.channel,
        "Задача снята с ревью",
        event.thread_ts
      );
      break;
    case "devlist":
      const approvers = parseDevList(event.text);
      db.push("/state/approvers", approvers);

      await replyWithText(
        event.channel,
        "Список разработчиков обновлен",
        event.event_ts
      );
      break;
    default:
      await replyWithText(event.channel, "Неверная команда", event.event_ts);
  }
});

slackEvents.on("message", async (event) => {
  const active = getBotState();

  if (!active || event.bot_id || !isDev(event.user)) return;

  if (!event.thread_ts && isTaskForReview(event.text)) {
    db.push(`/state/tasks/${event.event_ts}`, {
      status: 1, // 1 - review or 0 - paused
      author: event.user, // task author
      approved: [], // list of approved ids
      postponed: [], // list of postponed ids 1 hour
      task: isTaskForReview(event.text),
    });

    newCronJob(event.channel, event.event_ts);

    await appendRemainApproversLenght(event.channel, event.event_ts);
    return;
  }

  if (event.thread_ts) {
    let task = getTask(event.thread_ts);
    if (!task) return;

    // add user id to approved arr after get '++'
    if (event.text.match(/\+\+/)) {
      if (task.author === event.user) return;

      const emoji = await getReactionsList(event.channel, event.thread_ts);

      const botId = getBotId();

      if (emoji.message.reactions) {
        for (const reaction of emoji.message.reactions) {
          if (
            numberEmojisText.includes(reaction.name) &&
            reaction.users.includes(botId)
          ) {
            await removeReactionByName(
              event.channel,
              event.thread_ts,
              reaction.name
            );
          }
        }
      }

      db.push(`/state/tasks/${event.thread_ts}/approved`, [event.user], false);
      task = getTask(event.thread_ts);

      if (task.approved.length === getApproversLenght() - 1) {
        setTaskStatusActive(event.channel, event.thread_ts);
        db.delete(`/state/tasks/${event.thread_ts}`);
        return await replyWithText(
          event.channel,
          `Задача прошла ревью <@${task.author}>`,
          event.thread_ts
        );
      }

      await appendRemainApproversLenght(event.channel, event.thread_ts);
    }

    // unpause task if author fixed review suggestion
    if (event.text.toLocaleLowerCase().match(/fixed/)) {
      if (task.author === event.user)
        setTaskStatusActive(event.channel, event.thread_ts);
      return;
    }

    // pause when get string with '-' exapmle: 'backend -'
    if (event.text.match(/-/)) {
      if (task.author !== event.user)
        setTaskStatusPaused(event.channel, event.thread_ts);
      return;
    }
  }
});

slackEvents.on("error", console.error);

slackEvents.start(port).then(() => {
  console.log("server started on port: " + port);
});
