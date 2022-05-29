const db = require("../config/dbConfig");

const getBotState = () => {
  try {
    return db.getData("/state/active");
  } catch (error) {
    console.error(error.message);
  }
};

const isDev = (id) => {
  try {
    const devs = db.getData(`/state/approvers`);
    return Object.values(devs).flat().includes(id);
  } catch (error) {}
};

const getTask = (taskId) => {
  try {
    return db.getData(`/state/tasks/${taskId}`);
  } catch (error) {
    // console.error(error)
    return null;
  }
};

const getApprovers = (type) => {
  try {
    return db.getData(`/state/approvers/${type}`);
  } catch (error) {
    console.error(error);
  }
};

const getApproversLenght = () => {
  try {
    const approvers = db.getData("/state/approvers");

    return Object.values(approvers).flat().length;
  } catch (error) {
    console.error(error);
  }
};

const getBotId = () => {
  try {
    return db.getData("/state/botId");
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getApproversLenght,
  getApprovers,
  getBotState,
  getBotId,
  getTask,
  isDev,
};
