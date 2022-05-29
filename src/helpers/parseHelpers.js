const isTaskForReview = (text) => {
  const regExp = /(?<task>ADM-[0-9]{1,4})/;
  const result = regExp.exec(text);
  if (!result) return;
  if (result.groups) return result.groups.task;
};

const parseCommand = (text) => {
  const regExp = /!(?<command>[A-Za-z]+)\s<@(?<botId>[A-Z0-9]+)>/;
  return regExp.exec(text);
};

const parseDevList = (text) => {
  const regExp = /^(?<type>[A-Za-z]+)\s<@(?<userId>.*)>/;

  return text.split("\n").reduce((acc, row) => {
    const result = regExp.exec(row);

    if (!result) return acc;

    const {
      groups: { type, userId },
    } = result;

    if (!type) return acc;

    acc[type] ? acc[type].push(userId) : (acc[type] = [userId]);

    return acc;
  }, {});
};

module.exports = {
  isTaskForReview,
  parseCommand,
  parseDevList,
};
