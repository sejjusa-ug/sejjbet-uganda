const db = require('./db');

const MatchModel = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM sejjfixtures');
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM sejjfixtures WHERE id = ?', [id]);
    return rows[0];
  },

  updateStatus: async (id, status) => {
    await db.query('UPDATE sejjfixtures SET status = ? WHERE id = ?', [status, id]);
  },

  updateTime: async (id, minute) => {
    await db.query('UPDATE sejjfixtures SET currentMinute = ? WHERE id = ?', [minute, id]);
  },

  addEvent: async (id, event) => {
    const [rows] = await db.query('SELECT events FROM sejjfixtures WHERE id = ?', [id]);
    const currentEvents = rows[0]?.events ? JSON.parse(rows[0].events) : [];

    if (
      !event.type ||
      !event.team ||
      !event.player ||
      typeof event.minute !== 'number'
    ) {
      throw new Error('Invalid event structure');
    }

    currentEvents.push(event);
    await db.query('UPDATE sejjfixtures SET events = ? WHERE id = ?', [JSON.stringify(currentEvents), id]);

    return currentEvents;
  }
};

module.exports = MatchModel;