const db = require("../config/dbConfig");
const newCronJob = require("../cron");

const restartExistingTasks = () => {
  try {
    const activeTasks = db.getData(`/state/tasks`);

    const currentChannel = db.getData(`/state/channel`);

    Object.keys(activeTasks).forEach((timestamp) =>
      newCronJob(currentChannel, timestamp)
    );
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = restartExistingTasks;
