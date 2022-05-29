const { getTask, getApproversLenght } = require("./storageHelpers");
const { WebClient } = require("@slack/web-api");
const slackClient = new WebClient(process.env.SLACK_TOKEN);
const { numberEmojisText } = require("../constants");
const db = require("../config/dbConfig");

const replyWithText = async (channel, text, thread_ts) => {
  await slackClient.chat.postMessage({ channel, text, thread_ts });
};

const isInHuddleStatus = async (user) => {
  try {
    const { profile } = await slackClient.users.profile.get({ user });
    if (profile.huddle_state === "in_a_huddle") return true;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getReactionsList = async (channel, timestamp) => {
  try {
    return await slackClient.reactions.get({ channel, timestamp });
  } catch (error) {
    console.log(error);
  }
};

const appendRemainApproversLenght = async (channel, timestamp) => {
  const task = getTask(timestamp);

  // minus 1 for author
  const approvesRemain = getApproversLenght() - 1 - task.approved.length;

  if (approvesRemain > 0) {
    await slackClient.reactions.add({
      channel,
      timestamp,
      // minus 1 for correct array key
      name: numberEmojisText[approvesRemain - 1],
    });
  }
};

const removeReactionByName = async (channel, timestamp, name) => {
  try {
    await slackClient.reactions.remove({ channel, timestamp, name });
  } catch (error) {
    console.error(error);
  }
};

const setTaskStatusActive = async (channel, timestamp) => {
  try {
    db.push(`/state/tasks/${timestamp}/status`, 1);
    await slackClient.reactions.remove({
      channel,
      timestamp,
      name: "sleeping",
    });
  } catch (error) {}
};

const setTaskStatusPaused = async (channel, timestamp) => {
  try {
    db.push(`/state/tasks/${timestamp}/status`, 0);
    await slackClient.reactions.add({ channel, timestamp, name: "sleeping" });
  } catch (error) {}
};

module.exports = {
  appendRemainApproversLenght,
  removeReactionByName,
  setTaskStatusActive,
  setTaskStatusPaused,
  getReactionsList,
  isInHuddleStatus,
  replyWithText,
};
